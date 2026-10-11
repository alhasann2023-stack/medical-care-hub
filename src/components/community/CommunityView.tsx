import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  Share2,
  Send,
  Sparkles,
  ShieldAlert,
  Eye,
  EyeOff,
  Trash2,
  Pin,
  Stethoscope,
  User,
  PlusCircle,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ChevronDown,
  X,
  Lock,
  UserPlus,
  LogIn
} from 'lucide-react';
import { CommunityPost, PostComment, UserRole } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

interface CommunityViewProps {
  onBack?: () => void;
  defaultCategory?: string;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({ onBack, defaultCategory, onOpenAuth }) => {
  const { user, role, patientProfile } = useAuth();
  
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DOCTORS' | 'PATIENTS' | 'POPULAR' | 'HIDDEN'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>('');
  const [postContent, setPostContent] = useState<string>('');
  const [postCategory, setPostCategory] = useState<'HEALTH_TIP' | 'PATIENT_STORY' | 'DOCTOR_ARTICLE' | 'QUESTION' | 'GRATITUDE'>('HEALTH_TIP');
  const [postTags, setPostTags] = useState<string>('');
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  // Active Post for Comments
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Admin moderation reason modal
  const [modTargetPostId, setModTargetPostId] = useState<string | null>(null);
  const [modReason, setModReason] = useState<string>('');

  const isAdmin = role === 'HOSPITAL_ADMIN';
  const isDoctor = role === 'DOCTOR';
  const isPatient = role === 'PATIENT';
  const currentUserId = user?.id || patientProfile?.id || 'guest-1';
  const currentUserName = patientProfile?.fullName || user?.fullName || 'عضو في المجتمع';

  // Load posts
  useEffect(() => {
    setIsLoading(true);
    // Subscribe to live posts (include hidden if admin)
    const unsub = api.subscribeCommunityPosts((livePosts) => {
      setPosts(livePosts);
      setIsLoading(false);
    }, isAdmin);

    return () => unsub();
  }, [isAdmin]);

  // Load comments when a post is expanded
  const handleToggleComments = async (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
      return;
    }
    setExpandedCommentsPostId(postId);

    try {
      const list = await api.getPostComments(postId, isAdmin);
      setCommentsMap(prev => ({ ...prev, [postId]: list }));
    } catch (e) {
      console.warn('Failed loading comments:', e);
    }
  };

  // Like Post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await api.likeCommunityPost(postId, currentUserId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const likedBy = p.likedBy || [];
          const updatedLikedBy = res.isLiked
            ? [...likedBy, currentUserId]
            : likedBy.filter(id => id !== currentUserId);
          return {
            ...p,
            likesCount: res.likesCount,
            likedBy: updatedLikedBy
          };
        }
        return p;
      }));
    } catch (e) {
      console.warn('Like error:', e);
    }
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      const tagsArray = postTags
        .split(/[,،]+/)
        .map(t => t.trim())
        .filter(Boolean);

      const authorRole: 'PATIENT' | 'DOCTOR' | 'HOSPITAL_ADMIN' = isDoctor
        ? 'DOCTOR'
        : isAdmin
        ? 'HOSPITAL_ADMIN'
        : 'PATIENT';

      const authorTitle = isDoctor
        ? 'طبيب استشاري معتمد'
        : isAdmin
        ? 'إدارة المستشفى'
        : 'مريض ومراجع معتمد';

      const newPost = await api.createCommunityPost({
        authorId: currentUserId,
        authorName: currentUserName,
        authorRole,
        authorTitle,
        doctorId: isDoctor ? currentUserId : undefined,
        doctorSpecialty: isDoctor ? 'استشاري العيادات' : undefined,
        title: postTitle,
        content: postContent,
        category: postCategory,
        tags: tagsArray.length > 0 ? tagsArray : ['رعاية صحية']
      });

      // Immediately display new post in local React state
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);

      // Switch to appropriate filter so the newly created post is in view
      if (!isDoctor && !isAdmin && activeFilter === 'DOCTORS') {
        setActiveFilter('PATIENTS');
      }

      playSuccessSound();
      setPostTitle('');
      setPostContent('');
      setPostTags('');
      setIsCreateModalOpen(false);
    } catch (e) {
      console.warn('Create post error:', e);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!text) return;

    setIsSubmittingComment(true);
    try {
      const authorRole: 'PATIENT' | 'DOCTOR' | 'HOSPITAL_ADMIN' = isDoctor
        ? 'DOCTOR'
        : isAdmin
        ? 'HOSPITAL_ADMIN'
        : 'PATIENT';

      const authorTitle = isDoctor
        ? 'دكتور استشاري'
        : isAdmin
        ? 'مشرف المنصة'
        : 'مريض ومراجع';

      const newC = await api.addPostComment({
        postId,
        authorId: currentUserId,
        authorName: currentUserName,
        authorRole,
        authorTitle,
        content: text
      });

      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newC]
      }));

      setNewCommentText(prev => ({ ...prev, [postId]: '' }));

      // increment post comments count locally
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      playSuccessSound();
    } catch (e) {
      console.warn('Add comment error:', e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Admin: Hide/Show Post
  const handleAdminToggleHidePost = async (post: CommunityPost) => {
    const newHiddenState = !post.isHidden;
    const reason = newHiddenState ? 'تم إخفاء هذا المنشور بقرار إداري لمخالفته المعايير' : undefined;
    await api.adminToggleHidePost(post.id, newHiddenState, reason, currentUserName);
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isHidden: newHiddenState, hiddenReason: reason } : p));
  };

  // Admin: Pin/Unpin Post
  const handleAdminTogglePinPost = async (post: CommunityPost) => {
    const newPinned = !post.isPinned;
    await api.adminTogglePinPost(post.id, newPinned);
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isPinned: newPinned } : p));
  };

  // Admin: Delete Post
  const handleAdminDeletePost = async (postId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنشور نهائياً من المجتمع؟')) return;
    await api.adminDeletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Admin: Hide/Show Comment
  const handleAdminToggleHideComment = async (postId: string, comment: PostComment) => {
    const newHiddenState = !comment.isHidden;
    await api.adminToggleHideComment(comment.id, newHiddenState);
    setCommentsMap(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c => c.id === comment.id ? { ...c, isHidden: newHiddenState } : c)
    }));
  };

  // Admin: Delete Comment
  const handleAdminDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    await api.adminDeleteComment(commentId);
    setCommentsMap(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
    }));
  };

  // Filter Posts with deduplication to ensure unique keys
  const filteredPosts = React.useMemo(() => {
    const seen = new Set<string>();
    const unique: CommunityPost[] = [];
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const id = p.id || `post-entry-${i}`;
      if (!seen.has(id)) {
        seen.add(id);
        unique.push({ ...p, id });
      }
    }

    return unique.filter(p => {
      if (activeFilter === 'HIDDEN') return p.isHidden;
      if (!isAdmin && p.isHidden) return false;
      const isDoctorAuthor = p.authorRole === 'DOCTOR' || Boolean(p.doctorId);
      const isAdminAuthor = p.authorRole === 'HOSPITAL_ADMIN';
      if (activeFilter === 'DOCTORS') return isDoctorAuthor;
      if (activeFilter === 'PATIENTS') return !isDoctorAuthor && !isAdminAuthor;
      if (activeFilter === 'POPULAR') return (p.likesCount || 0) >= 10;
      return true;
    });
  }, [posts, activeFilter, isAdmin]);

  // Tab counts for intuitive feedback
  const visiblePosts = React.useMemo(() => {
    return posts.filter(p => isAdmin || !p.isHidden);
  }, [posts, isAdmin]);

  const doctorPostsCount = React.useMemo(() => {
    return visiblePosts.filter(p => p.authorRole === 'DOCTOR' || Boolean(p.doctorId)).length;
  }, [visiblePosts]);

  const patientPostsCount = React.useMemo(() => {
    return visiblePosts.filter(p => p.authorRole !== 'DOCTOR' && !p.doctorId && p.authorRole !== 'HOSPITAL_ADMIN').length;
  }, [visiblePosts]);

  const popularPostsCount = React.useMemo(() => {
    return visiblePosts.filter(p => (p.likesCount || 0) >= 10).length;
  }, [visiblePosts]);

  // Health Community Access Guard: Must have an account to view or participate
  if (!user) {
    return (
      <div className="space-y-6" dir="rtl">
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs w-fit"
          >
            <span>← العودة للوحة الرئيسية</span>
          </button>
        )}

        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-teal-50 border-2 border-teal-200 rounded-3xl flex items-center justify-center mx-auto text-teal-700 shadow-inner">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              مجتمع الصحة والرعاية متاح للأعضاء فقط
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              وفقاً لسياسة الخصوصية والأمان، لا يمكن الوصول إلى مجتمع الصحة أو استعراض تجارب المرضى والمقالات الطبية إلا بعد إنشاء حساب أو تسجيل الدخول إلى المنصة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth ? onOpenAuth('register') : undefined}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حساب جديد</span>
            </button>

            <button
              onClick={() => onOpenAuth ? onOpenAuth('login') : undefined}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-teal-800 via-cyan-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="mb-2 text-xs font-bold text-teal-200 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>← العودة للوحة الرئيسية</span>
              </button>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
                <MessageSquare className="w-6 h-6 text-amber-300" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black">مجتمع الصحة والرعاية التفاعلي</h1>
            </div>
            <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
              منصة عامة تجمع المرضى والأطباء لتبادل التجارب والنصائح الطبية الموثوقة والتفاعل البنّاء
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPostCategory(isDoctor ? 'HEALTH_TIP' : 'PATIENT_STORY');
                setIsCreateModalOpen(true);
              }}
              className="py-3 px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5 text-slate-950" />
              <span>{isDoctor ? 'كتابة مقال أو نصيحة طبية' : 'مشاركة منشور جديد'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Notice Bar */}
      {isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>لوحة تحكم المشرف: لديك صلاحية إخفاء/إظهار وتثبيت وحذف أي منشور أو تعليق لحماية المجتمع.</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[11px]">صلاحية الأدمن مفعلة</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === 'ALL'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          كافة المنشورات ({visiblePosts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('DOCTORS')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'DOCTORS'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
          <span>مقالات وإرشادات الأطباء ({doctorPostsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('PATIENTS')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'PATIENTS'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <User className="w-3.5 h-3.5 text-blue-500" />
          <span>تجارب واستشارات المرضى ({patientPostsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('POPULAR')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'POPULAR'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>الأكثر تفاعلاً وإعجاباً ({popularPostsCount})</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveFilter('HIDDEN')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'HIDDEN'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            <span>المنشورات المخفية ({posts.filter(p => p.isHidden).length})</span>
          </button>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل منشورات المجتمع...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-800">لا توجد منشورات في هذا القسم حالياً</h3>
            <p className="text-xs text-slate-500">كن أول من يشارك تجربة أو نصيحة طبية قيّمة لزوار المجتمع!</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2 px-4 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              إنشاء منشور الآن
            </button>
          </div>
        ) : (
          filteredPosts.map((post, postIdx) => {
            const isLiked = (post.likedBy || []).includes(currentUserId);
            const isAuthorDoctor = post.authorRole === 'DOCTOR';
            const isPostHidden = Boolean(post.isHidden);
            const isCommentsOpen = expandedCommentsPostId === post.id;
            const postComments = commentsMap[post.id] || [];
            const postKey = post.id ? `post-${post.id}-${postIdx}` : `post-item-${postIdx}`;

            return (
              <div
                key={postKey}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isPostHidden
                    ? 'border-amber-300 bg-amber-50/20 opacity-90'
                    : post.isPinned
                    ? 'border-teal-400 ring-2 ring-teal-100'
                    : 'border-slate-300 hover:border-blue-300'
                }`}
              >
                {/* Pinned & Hidden Bar */}
                {(post.isPinned || isPostHidden) && (
                  <div className={`px-5 py-2 text-xs font-extrabold flex items-center justify-between ${
                    isPostHidden ? 'bg-amber-100 text-amber-900' : 'bg-teal-50 text-teal-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {isPostHidden ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                          <span>منشور مخفي عن العامة (بواسطة الإدارة) {post.hiddenReason ? `• ${post.hiddenReason}` : ''}</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 text-teal-700" />
                          <span>منشور مثبت في مقدمة المجتمع</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Post Header */}
                <div className="p-5 sm:p-6 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${
                        isAuthorDoctor
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                          : post.authorRole === 'HOSPITAL_ADMIN'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-700 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      }`}>
                        {isAuthorDoctor ? <Stethoscope className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{post.authorName}</span>
                          {isAuthorDoctor && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Stethoscope className="w-2.5 h-2.5" />
                              طبيب استشاري
                            </span>
                          )}
                          {post.authorRole === 'PATIENT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              مريض ومراجع
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{post.authorTitle || (isAuthorDoctor ? 'استشاري العيادات' : 'عضو المجتمع')}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(post.createdAt).toLocaleDateString('ar-YE', { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Moderation Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          title={post.isPinned ? 'إلغاء التثبيت' : 'تثبيت المنشور'}
                          onClick={() => handleAdminTogglePinPost(post)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            post.isPinned ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          <Pin className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          title={isPostHidden ? 'إظهار المنشور للعامة' : 'إخفاء المنشور عن العامة'}
                          onClick={() => handleAdminToggleHidePost(post)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isPostHidden ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          {isPostHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          title="حذف المنشور نهائياً"
                          onClick={() => handleAdminDeletePost(post.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post Title & Content */}
                  <h3 className="text-base font-extrabold text-slate-900 mb-2 leading-snug">
                    {post.title}
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {post.tags.map((tag, tagIdx) => (
                        <span
                          key={`${postKey}-tag-${tagIdx}-${tag}`}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interaction Footer (Likes & Comments Button) */}
                <div className="px-5 py-3 bg-blue-100 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-rose-100 text-rose-700 scale-105'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{post.likesCount || 0}</span>
                      <span className="hidden sm:inline">إعجاب</span>
                    </button>

                    {/* Comments Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleComments(post.id)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCommentsOpen
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.commentsCount || 0}</span>
                      <span>تعليقات</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {post.category === 'HEALTH_TIP' ? '💡 نصيحة طبية' : post.category === 'PATIENT_STORY' ? '📖 تجربة مريض' : '🩺 مقال استشاري'}
                  </span>
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="bg-slate-50/80 p-5 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-2.5">
                      {postComments.filter(c => isAdmin || !c.isHidden).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium">
                          لا توجد تعليقات بعد، كن أول من يعلق على هذا المنشور!
                        </div>
                      ) : (
                        postComments
                          .filter(c => isAdmin || !c.isHidden)
                          .map((comment, commentIdx) => {
                            const isCommentHidden = Boolean(comment.isHidden);
                            const commentKey = comment.id ? `comment-${comment.id}-${commentIdx}` : `${postKey}-comment-${commentIdx}`;

                            return (
                              <div
                                key={commentKey}
                                className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                                isCommentHidden
                                  ? 'bg-amber-50/80 border-amber-300 opacity-80'
                                  : 'bg-white border-slate-200 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{comment.authorName}</span>
                                  {comment.authorRole === 'DOCTOR' && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                                      طبيب
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(comment.createdAt).toLocaleDateString('ar-YE')}
                                  </span>
                                  {isCommentHidden && (
                                    <span className="text-[10px] font-bold text-amber-700">(مخفي عن العامة)</span>
                                  )}
                                </div>

                                {isAdmin && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAdminToggleHideComment(post.id, comment)}
                                      title={isCommentHidden ? 'إظهار التعليق' : 'إخفاء التعليق'}
                                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 cursor-pointer"
                                    >
                                      {isCommentHidden ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminDeleteComment(post.id, comment.id)}
                                      title="حذف التعليق"
                                      className="p-1 rounded-md text-rose-500 hover:text-rose-700 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="text-slate-700 font-normal leading-relaxed">{comment.content}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* New Comment Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCommentText[post.id] || ''}
                        onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="أضف تعليقك أو استفسارك هنا..."
                        className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      <button
                        type="button"
                        disabled={isSubmittingComment || !newCommentText[post.id]?.trim()}
                        onClick={() => handleAddComment(post.id)}
                        className="p-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE POST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-teal-700 to-blue-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <PlusCircle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {isDoctor ? 'نشر مقال / نصيحة طبية جديدة' : 'مشاركة منشور في مجتمع المرضى'}
                  </h3>
                  <p className="text-xs text-teal-100">سيظهر المنشور للعامة ويمكن للجميع التفاعل والتعليق</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700">نوع المنشور:</label>
                <select
                  value={postCategory}
                  onChange={(e: any) => setPostCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="HEALTH_TIP">💡 نصيحة وتثقيف صحي</option>
                  <option value="PATIENT_STORY">📖 تجربة مريض ورحلة علاج</option>
                  <option value="DOCTOR_ARTICLE">🩺 مقال استشاري موثق</option>
                  <option value="GRATITUDE">🌹 شكر وتقدير للكادر الطبي</option>
                  <option value="QUESTION">❓ استفسار عام للجمهور</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700">عنوان المنشور:</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="اكتب عنواناً جذاباً وموجزاً..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700">نص المنشور ومحتواه:</label>
                <textarea
                  rows={5}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="اكتب تفاصيل المنشور أو النصيحة هنا..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700">الوسوم / الكلمات المفتاحية (مفصولة بفاصلة):</label>
                <input
                  type="text"
                  value={postTags}
                  onChange={(e) => setPostTags(e.target.value)}
                  placeholder="مثال: صحة القلب، استشارات، وقاية"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="py-2.5 px-6 bg-gradient-to-r from-teal-700 to-cyan-800 hover:from-teal-800 hover:to-cyan-900 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPost ? 'جاري النشر...' : 'نشر في المجتمع الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
