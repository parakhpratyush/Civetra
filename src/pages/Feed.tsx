import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, MessageSquare, ThumbsUp, Loader2, Send, MapPin, Search, Filter, ChevronDown, User, X, Eye, Paperclip, Image, Video, FileText, Share2, Trash2, Edit2 } from "lucide-react";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, increment, arrayUnion, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { Issue, Comment, ISSUE_CATEGORIES } from "../types";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotification, playTruongSound } from "../contexts/NotificationContext";

export function Feed() {
  const { isDark } = useTheme();
  const { currentUser, userProfile, isAdmin, setIsAuthModalOpen } = useAuth();
  const { showNotification } = useNotification();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL ISSUES");
  const [statusFilter, setStatusFilter] = useState("ALL STATUSES");
  const [sortFilter, setSortFilter] = useState("NEWEST FIRST");
  
  const routerLocation = useLocation();
  const passedState = routerLocation.state as { expandedIssueId?: string } | null;
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(passedState?.expandedIssueId || null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeListTab, setActiveListTab] = useState<'active' | 'resolved' | 'community'>('active');
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedDescIds, setExpandedDescIds] = useState<Set<string>>(new Set());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");

  useEffect(() => {
    if (passedState?.expandedIssueId) {
      setExpandedIssueId(passedState.expandedIssueId);
      setTimeout(() => {
        const el = document.getElementById(`issue-${passedState.expandedIssueId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [passedState?.expandedIssueId]);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const qIssues = query(collection(db, "issues"), orderBy("reportedAt", "desc"));
    const unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetchedIssues);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching issues:", error);
      setLoading(false);
    });

    const qPosts = query(collection(db, "community_posts"), orderBy("createdAt", "desc"));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      const fetchedPosts: any[] = [];
      snapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() });
      });
      setCommunityPosts(fetchedPosts);
    });

    return () => {
      unsubscribeIssues();
      unsubscribePosts();
    };
  }, []);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !postFile) || !isAdmin || !currentUser) return;

    if (postFile && postFile.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    // Capture state for background processing
    const textContent = newPostContent;
    const currentFile = postFile;

    // Create an optimistic post object for instant UI rendering
    const optimisticPost = {
      id: `optimistic-${Date.now()}`,
      content: textContent,
      createdAt: { 
        toMillis: () => Date.now(), 
        seconds: Math.floor(Date.now() / 1000),
        toDate: () => new Date()
      },
      authorId: currentUser.uid,
      authorName: "Civetra Admin",
      likes: 0,
      likedBy: [],
      ...(currentFile && { 
        mediaUrl: URL.createObjectURL(currentFile), 
        mediaType: currentFile.type 
      })
    };

    // Optimistically update the UI instantly (Zero Latency)
    setCommunityPosts(prev => [optimisticPost, ...prev]);
    setNewPostContent("");
    setPostFile(null);
    playTruongSound();
    showNotification("Posted Successfully", "Your community post is now live.", "success");

    // Fire-and-forget backend process
    Promise.resolve().then(async () => {
      try {
        let mediaUrl = null;
        let mediaType = null;
        
        if (currentFile) {
          // Keep under Firestore's 1MB document limit to stay on the free tier!
          if (currentFile.size > 800 * 1024) {
            throw new Error("File too large! To keep this database 100% free, please upload an image smaller than 800KB.");
          }
          mediaUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(currentFile);
          });
          mediaType = currentFile.type;
        }
        
        const postData: any = {
          content: textContent,
          createdAt: serverTimestamp(),
          authorId: currentUser.uid,
          authorName: "Civetra Admin",
          likes: 0,
          likedBy: [],
        };
        
        if (mediaUrl) {
          postData.mediaUrl = mediaUrl;
          postData.mediaType = mediaType;
        }
        
        const docRef = await addDoc(collection(db, "community_posts"), postData);
        
        // Update the optimistic post with the real ID so likes work instantly
        setCommunityPosts(prev => prev.map(p => p.id === optimisticPost.id ? { ...p, id: docRef.id } : p));
      } catch (err: any) {
        console.error("Failed to create post", err);
        setCommunityPosts(prev => prev.filter(p => p.id !== optimisticPost.id));
        showNotification("Post Failed", "Server rejected the post. " + (err.message || ""), "info");
      }
    });
  };

  const handleDeletePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      setCommunityPosts(prev => prev.filter(p => p.id !== postId));
      await deleteDoc(doc(db, "community_posts", postId));
      showNotification("Deleted", "Post was deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, "community_posts", postId), { content: editingPostContent });
      setEditingPostId(null);
      showNotification("Updated", "Post was updated successfully", "success");
    } catch (err) {
      console.error("Failed to update", err);
    }
  };

  const handleLikePost = async (postId: string, post: any) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const postRef = doc(db, "community_posts", postId);
    const hasLiked = post.likedBy?.includes(currentUser.uid);
    if (hasLiked) {
      await updateDoc(postRef, {
        likes: increment(-1),
        likedBy: post.likedBy?.filter((id: string) => id !== currentUser.uid) || []
      });
    } else {
      await updateDoc(postRef, {
        likes: increment(1),
        likedBy: arrayUnion(currentUser.uid)
      });
    }
  };

  const handleExpand = async (id: string) => {
    setExpandedDescIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Increment view count in DB
        const issueRef = doc(db, "issues", id);
        updateDoc(issueRef, { views: increment(1) }).catch(console.error);
      }
      return next;
    });
  };

  const handleUpvote = async (id: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const issue = issues.find(i => i.id === id);
    if (!issue) return;

    const issueRef = doc(db, "issues", id);
    const hasUpvoted = issue.upvotedBy?.includes(currentUser.uid);

    if (hasUpvoted) {
      // Remove upvote
      await updateDoc(issueRef, { 
        upvotes: increment(-1),
        upvotedBy: issue.upvotedBy?.filter(uid => uid !== currentUser.uid) || []
      });
    } else {
      // Add upvote
      await updateDoc(issueRef, { 
        upvotes: increment(1),
        upvotedBy: [...(issue.upvotedBy || []), currentUser.uid]
      });
    }
  };

  const handleVerify = async (id: string, currentVerifications: number) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const issue = issues.find(i => i.id === id);
    if (!issue) return;

    const hasVerified = issue.verifiedBy?.includes(currentUser.uid);
    const issueRef = doc(db, "issues", id);

    if (hasVerified) {
      // Remove verify
      const newCount = Math.max(0, currentVerifications - 1);
      await updateDoc(issueRef, { 
        verifications: increment(-1),
        verifiedBy: issue.verifiedBy?.filter(uid => uid !== currentUser.uid) || [],
        status: newCount < 5 && issue.status === "verified" ? "in_progress" : issue.status
      });
    } else {
      // Add verify
      const updates: any = { 
        verifications: increment(1),
        verifiedBy: [...(issue.verifiedBy || []), currentUser.uid]
      };
      if (currentVerifications + 1 >= 5) {
         updates.status = "verified";
      }
      await updateDoc(issueRef, updates);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const issueRef = doc(db, "issues", id);
    await updateDoc(issueRef, { 
      status: "in_progress", 
      revokedBy: userProfile?.name || "Anonymous Citizen"
    });
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!isAdmin) return;
    const issueRef = doc(db, "issues", id);
    await updateDoc(issueRef, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Are you sure you want to delete this issue?")) {
      await deleteDoc(doc(db, "issues", id));
    }
  };

  const handleAddComment = async (id: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    
    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      author: "Anonymous Citizen",
      createdAt: Date.now()
    };

    const issueRef = doc(db, "issues", id);
    await updateDoc(issueRef, { 
      comments: arrayUnion(comment) 
    });

    setNewComment("");
    setIsSubmittingComment(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-7xl mx-auto space-y-8 px-4 md:px-0 font-sans pt-24 min-h-[70vh]">
      {/* HEADER, SEARCH, AND FILTERS (Hidden on Community Tab) */}
      {activeListTab !== 'community' && (
        <div className="space-y-4">
          <div className={`w-full rounded-full border px-6 py-4 flex justify-between items-center gap-4 ${isDark ? 'bg-black/50 border-white/10 shadow-lg' : 'bg-white border-black/10 shadow-sm'}`}>
            <div className="flex items-center gap-3 w-full">
              <Search className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-black/50'}`} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for issues by keyword, address, or description..."
                className={`w-full bg-transparent outline-none font-medium text-xs md:text-sm ${isDark ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
            <div className={`hidden md:block text-[8px] font-bold tracking-[0.2em] uppercase shrink-0 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              NOIDA INDEXING / CORE PLATFORM
            </div>
          </div>

          {/* FILTER ROW */}
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-between w-full md:w-auto gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-widest border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-black/5 border-black/10 hover:bg-black/10 text-black'}`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>FILTERS & CATEGORIES</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                className={`absolute top-full left-0 mt-2 w-full md:w-[450px] z-50 rounded-2xl border p-4 shadow-2xl ${isDark ? 'bg-[#08080c] border-white/10' : 'bg-white border-black/10'}`}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`text-[10px] font-bold tracking-widest uppercase mb-3 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setCategoryFilter("ALL ISSUES")}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all border ${categoryFilter === "ALL ISSUES" ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDark ? 'bg-transparent text-white/60 border-white/10' : 'bg-transparent text-black/60 border-black/10')}`}
                      >
                        ALL ISSUES
                      </button>
                      {ISSUE_CATEGORIES.map(cat => (
                        <button 
                          key={cat.id} 
                          onClick={() => setCategoryFilter(cat.label)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${categoryFilter.toLowerCase() === cat.label.toLowerCase() ? (isDark ? 'bg-white/20 border-white/30 text-white' : 'bg-black/10 border-black/30 text-black') : (isDark ? 'border-white/10 text-white/60 hover:text-white hover:border-white/30' : 'border-black/10 text-black/60 hover:text-black hover:border-black/30')}`}
                        >
                          <img src={cat.imageUrl} alt={cat.label} className="w-3 h-3 object-cover rounded border border-black dark:border-white" />
                          <span className="uppercase">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                  <div className="flex gap-2">
                    {activeListTab === 'active' && (
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold tracking-widest border transition-colors outline-none cursor-pointer ${isDark ? 'border-white/10 text-white bg-[#08080c] hover:bg-white/5' : 'border-black/10 text-black bg-white hover:bg-black/5'}`}>
                        <option value="ALL STATUSES">ALL STATUSES</option>
                        <option value="reported">REPORTED</option>
                        <option value="in_progress">IN PROGRESS</option>
                        <option value="verified">VERIFIED</option>
                        <option value="revoked">REVOKED ISSUE</option>
                      </select>
                    )}
                    <select 
                      value={sortFilter}
                      onChange={(e) => setSortFilter(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold tracking-widest border transition-colors outline-none cursor-pointer ${isDark ? 'border-white/10 text-white bg-[#08080c] hover:bg-white/5' : 'border-black/10 text-black bg-white hover:bg-black/5'}`}>
                      <option value="NEWEST FIRST">NEWEST FIRST</option>
                      <option value="OLDEST FIRST">OLDEST FIRST</option>
                      <option value="MOST UPVOTED">MOST UPVOTED</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* TABS */}
      <div className={`flex gap-4 border-b mt-4 mb-6 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <button 
          onClick={() => setActiveListTab('active')}
          className={`px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 ${activeListTab === 'active' ? 'border-amber-500 text-amber-500' : isDark ? 'border-transparent text-white/50 hover:text-white' : 'border-transparent text-slate-900 hover:text-black'}`}>
          Active Issues
        </button>
        <button 
          onClick={() => setActiveListTab('resolved')}
          className={`px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 ${activeListTab === 'resolved' ? 'border-amber-500 text-amber-500' : isDark ? 'border-transparent text-white/50 hover:text-white' : 'border-transparent text-slate-900 hover:text-black'}`}>
          Resolved Issues
        </button>
        <button 
          onClick={() => setActiveListTab('community')}
          className={`px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 ${activeListTab === 'community' ? 'border-amber-500 text-amber-500' : isDark ? 'border-transparent text-white/50 hover:text-white' : 'border-transparent text-slate-900 hover:text-black'}`}>
          Community Post
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeListTab === 'community' ? (
          <motion.div 
            key="community"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 pb-32"
          >
            {isAdmin && (
            <form onSubmit={handleCreatePost} className={`p-6 rounded-[20px] shadow-sm border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Create Community Post
              </h3>
              <textarea 
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder="Share an update with the community..."
                className={`w-full p-4 rounded-xl border outline-none min-h-[100px] resize-y mb-4 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-black/5 border-black/10 text-black placeholder-black/30'}`}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="post-media"
                    className="hidden"
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPostFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="post-media" className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-black/5 text-slate-900 hover:bg-black/10'}`}>
                    <Paperclip className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Media</span>
                  </label>
                  {postFile && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
                      <span className="truncate max-w-[120px] sm:max-w-[150px]">{postFile.name}</span>
                      <button type="button" onClick={() => setPostFile(null)} className="hover:text-amber-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={isPosting || (!newPostContent.trim() && !postFile)}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </form>
          )}

          {communityPosts.length === 0 ? (
            <div className={`text-center p-12 rounded-[20px] shadow-sm border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'}`}>
              <p className={isDark ? 'text-white/40' : 'text-black/40'}>No community posts yet.</p>
            </div>
          ) : (
            communityPosts.map(post => (
              <div key={post.id} className={`p-6 rounded-[20px] shadow-sm border transition-all ${isDark ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-white border-black/10 hover:border-black/20'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                    A
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{post.authorName}</h4>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
                {editingPostId === post.id ? (
                  <div className="mb-4">
                    <textarea
                      value={editingPostContent}
                      onChange={(e) => setEditingPostContent(e.target.value)}
                      className={`w-full p-4 rounded-xl resize-none outline-none border transition-colors ${isDark ? 'bg-white/5 border-white/20 text-white focus:bg-white/10' : 'bg-black/5 border-black/20 text-black focus:bg-black/10'}`}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setEditingPostId(null)} className="px-4 py-2 rounded-xl text-xs font-bold transition-colors text-slate-500 hover:bg-slate-500/10">Cancel</button>
                      <button onClick={() => handleUpdatePost(post.id)} className="px-4 py-2 rounded-xl text-xs font-bold transition-colors bg-blue-500 text-white hover:bg-blue-600">Save</button>
                    </div>
                  </div>
                ) : (
                  <p className={`whitespace-pre-wrap ${post.mediaUrl ? 'mb-4' : 'mb-6'} ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{post.content}</p>
                )}
                {post.mediaUrl && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/5">
                    {post.mediaType?.startsWith('image/') ? (
                      <img src={post.mediaUrl} alt="Post media" className="w-full max-h-[400px] object-cover" />
                    ) : post.mediaType?.startsWith('video/') ? (
                      <video src={post.mediaUrl} controls className="w-full max-h-[400px]" />
                    ) : (
                      <a href={post.mediaUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-4 hover:bg-white/5 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <FileText className="w-6 h-6 text-amber-500" />
                        <span className="font-bold text-sm hover:underline">View Attached Document</span>
                      </a>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLikePost(post.id, post)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${post.likedBy?.includes(currentUser?.uid) ? 'bg-amber-500/10 text-amber-500' : isDark ? 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-black/50 hover:bg-black/10 hover:text-black'}`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${post.likedBy?.includes(currentUser?.uid) ? 'fill-amber-500' : ''}`} />
                    {post.likes || 0} Likes
                  </button>
                  <button 
                    onClick={async () => {
                      const shareData: any = {
                        title: 'Civetra Community Update',
                        text: `Check out this update from ${post.authorName} on Civetra:\n\n"${post.content}"\n`,
                        url: 'https://civetra.com'
                      };
                      
                      try {
                        if (post.mediaUrl) {
                          const res = await fetch(post.mediaUrl);
                          const blob = await res.blob();
                          let ext = 'bin';
                          if (blob.type.includes('jpeg') || blob.type.includes('jpg')) ext = 'jpg';
                          else if (blob.type.includes('png')) ext = 'png';
                          else if (blob.type.includes('pdf')) ext = 'pdf';
                          else if (blob.type.includes('video/mp4')) ext = 'mp4';
                          
                          const file = new File([blob], `community_media.${ext}`, { type: blob.type });
                          if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            shareData.files = [file];
                          }
                        }
                        
                        if (navigator.share) {
                          await navigator.share(shareData);
                        } else {
                          navigator.clipboard.writeText(`Check out this update from ${post.authorName} on Civetra:\n\n"${post.content}"\nhttps://civetra.com`);
                          alert('Copied to clipboard! Native sharing not supported.');
                        }
                      } catch (err) {
                        console.error('Share failed:', err);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-black/50 hover:bg-black/10 hover:text-black'}`}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {isAdmin && (
                    <div className="ml-auto flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingPostId(post.id); setEditingPostContent(post.content); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          </motion.div>
        ) : (
          <motion.div 
            key="issues"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-white/50' : 'text-black/50'}`} />
            </div>
          ) : issues.filter(issue => {
                const matchesSearch = searchQuery.trim() === "" || 
                  issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  issue.location.address.toLowerCase().includes(searchQuery.toLowerCase());
                
                const matchesCategory = categoryFilter === "ALL ISSUES" || issue.category.toLowerCase() === categoryFilter.toLowerCase();
                const matchesStatus = statusFilter === "ALL STATUSES" || issue.status.toLowerCase() === statusFilter.toLowerCase();
                
                return matchesSearch && matchesCategory && matchesStatus;
              }).length === 0 ? (
            <div className={`text-center p-12 rounded-2xl shadow-sm border ${isDark ? 'bg-black/50 border-white/10' : 'bg-white border-black/10'}`}>
              <p className={isDark ? 'text-white/40' : 'text-black/40'}>No issues reported yet. Be the first to report an issue!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch pb-32">
              {issues.filter(issue => {
                const matchesSearch = searchQuery.trim() === "" || 
                  issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  issue.location.address.toLowerCase().includes(searchQuery.toLowerCase());
                
                const matchesCategory = categoryFilter === "ALL ISSUES" || issue.category.toLowerCase() === categoryFilter.toLowerCase();
                const matchesStatus = statusFilter === "ALL STATUSES" || issue.status.toLowerCase() === statusFilter.toLowerCase();
                const isResolvedTabMatch = activeListTab === 'resolved' ? issue.status === 'resolved' : issue.status !== 'resolved';
                
                return matchesSearch && matchesCategory && matchesStatus && isResolvedTabMatch;
              }).sort((a, b) => {
             if (sortFilter === "OLDEST FIRST") return a.reportedAt - b.reportedAt;
             if (sortFilter === "MOST UPVOTED") return (b.upvotes || 0) - (a.upvotes || 0);
             return b.reportedAt - a.reportedAt;
          }).map((issue) => (
            <div id={`issue-${issue.id}`} key={issue.id} className={`rounded-[20px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] border backdrop-blur-2xl transition-all flex flex-col ${isDark ? 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/50' : 'bg-white/50 border-white/60 hover:bg-white/70 hover:border-white'}`}>
              
              {/* IMAGE HEADER WITH BADGES */}
              <div className={`relative h-48 w-full overflow-hidden ${isDark ? 'bg-gradient-to-b from-white/20 to-white/5' : 'bg-gradient-to-b from-black/20 to-black/5'}`}>
                {((issue.mediaUrls && issue.mediaUrls.length > 0) || issue.mediaUrl || issue.imageUrl) && (
                  (() => {
                    const firstMedia = issue.mediaUrls?.[0] || issue.mediaUrl || issue.imageUrl || "";
                    return (
                      <>
                        {firstMedia.startsWith('data:video') ? (
                          <video src={firstMedia} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                          <img src={firstMedia} alt={issue.title} className="w-full h-full object-cover" />
                        )}
                        {issue.mediaUrls && issue.mediaUrls.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md z-10 shadow-lg border border-white/20 uppercase tracking-widest">
                            +{issue.mediaUrls.length - 1} Media
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
                
                {/* Top Left Severity Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest shadow-lg ${
                    issue.severity === 'High' || issue.severity === 'Critical' ? 'bg-[#ff4d4d] text-white' : 
                    issue.severity === 'Medium' ? 'bg-[#ffa64d] text-white' : 
                    'bg-[#4da6ff] text-white'
                  }`}>
                    {issue.severity === 'High' || issue.severity === 'Critical' ? <AlertTriangle className="w-3 h-3" /> : null}
                    {issue.severity}
                  </span>
                </div>
                
                {/* Top Right Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest shadow-lg ${
                    issue.status === 'resolved' ? 'bg-[#00cc66] text-white' : 
                    issue.status === 'revoked' ? 'bg-[#ff3333] text-white' :
                    'bg-[#1a1a1a] text-white'
                  }`}>
                    {issue.status === 'resolved' ? 'RESOLVED' : issue.status === 'revoked' ? 'REVOKED (RE-OPENED)' : issue.status === 'in_progress' ? 'IN PROGRESS' : issue.status === 'verified' ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
              </div>

              {/* CARD BODY */}
              <div className="p-5 flex flex-col gap-4 flex-1 relative">
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(issue.id); }}
                    className="absolute right-4 top-4 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors z-20 shadow-lg"
                    title="Delete Issue"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="space-y-3 pr-8">
                  <h3 className={`text-[15px] font-bold leading-tight ${isDark ? 'text-white' : 'text-[#1a1a1a]'}`}>{issue.title}</h3>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.08em] leading-relaxed transition-all ${isDark ? 'text-white/50' : 'text-black/50'} ${expandedDescIds.has(issue.id) ? '' : 'line-clamp-2'}`}>
                      {issue.description}
                    </p>
                    {issue.description && issue.description.length > 80 && (
                      <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExpand(issue.id); }} className="inline-block text-left text-[9px] font-bold text-blue-500 uppercase mt-2 hover:underline cursor-pointer border-none outline-none bg-transparent p-0 m-0 shadow-none">
                        {expandedDescIds.has(issue.id) ? 'Show Less' : '... More'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mt-auto pt-2">
                  <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{issue.location.address || "Location unavailable"}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    <User className="w-3 h-3" />
                    <span>Reported By: {issue.reportedBy} • {(() => {
                      const timeVal = issue.reportedAt;
                      let d = new Date();
                      if (timeVal) {
                        if (typeof timeVal === 'number') d = new Date(timeVal);
                        else if (typeof (timeVal as any).toDate === 'function') d = (timeVal as any).toDate();
                        else if ((timeVal as any).seconds) d = new Date((timeVal as any).seconds * 1000);
                        else d = new Date(timeVal as any);
                      }
                      return d.toLocaleDateString();
                    })()}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    <Eye className="w-3 h-3" />
                    <span>{issue.views || 0} Views</span>
                  </div>
                  {issue.revokedBy && (
                    <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-red-500`}>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Revoked By: {issue.revokedBy}</span>
                    </div>
                  )}
                </div>

                {/* VERIFICATION COUNTER */}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-extrabold tracking-[0.15em] uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>VERIFICATIONS</span>
                    <span className={`text-[10px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>Verified by {issue.verifications || 0} users</span>
                  </div>
                </div>
                
                {/* ACTION FOOTER */}
                <div className={`mt-4 flex items-center justify-between p-1.5 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                  <button onClick={() => handleUpvote(issue.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-colors !border-none ${isDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>
                    <ThumbsUp className="w-4 h-4" />
                    <span>{issue.upvotes || 0}</span>
                  </button>
                  <div className={`w-[1px] h-5 ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
                  
                  {issue.status === 'resolved' ? (
                    <button onClick={() => handleRevoke(issue.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-colors !border-none text-red-500 hover:text-red-400`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span>REVOKE</span>
                    </button>
                  ) : (
                    <button onClick={() => handleVerify(issue.id, issue.verifications || 0)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-colors !border-none ${isDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>
                      <CheckCircle className={`w-4 h-4 ${issue.verifiedBy?.includes(currentUser?.uid || '') ? 'text-green-500' : ''}`} />
                      <span>VERIFY</span>
                    </button>
                  )}
                  
                  <div className={`w-[1px] h-5 ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
                  <button onClick={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-colors !border-none ${isDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>
                    <MessageSquare className="w-4 h-4" />
                    <span>{issue.comments?.length || 0}</span>
                  </button>
                </div>

                {/* EXPANDED COMMENTS */}
                <AnimatePresence>
                  {expandedIssueId === issue.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`pt-4 mt-2 border-t ${isDark ? 'border-white/10' : 'border-black/10'} space-y-4`}>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                          {(!issue.comments || issue.comments.length === 0) ? (
                            <p className={`text-xs font-bold uppercase tracking-wider italic text-center py-4 ${isDark ? 'text-white/40' : 'text-black/40'}`}>No comments yet</p>
                          ) : (
                            issue.comments.map((comment, index) => (
                              <div key={index} className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-black'}`}>{comment.author}</span>
                                  <span className={`text-[9px] uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-black/70'}`}>{comment.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add to discussion..."
                            className={`flex-1 text-xs font-bold px-4 py-2 rounded-full border outline-none transition-all ${isDark ? 'bg-black text-white border-white/20 focus:border-white' : 'bg-white text-black border-black/20 focus:border-black'} placeholder:opacity-40`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(issue.id);
                            }}
                          />
                          <button
                            onClick={() => handleAddComment(issue.id)}
                            disabled={!newComment.trim() || isSubmittingComment}
                            className={`p-2.5 rounded-full transition-all flex items-center justify-center shrink-0 ${!newComment.trim() || isSubmittingComment ? 'opacity-50 opacity-50' : 'hover:scale-105 '} ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}
                          >
                            {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          ))}
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
