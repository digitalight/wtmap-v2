import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Comment {
  id: number;
  comment: string;
  rating: number;
  user_id: string;
  user_email?: string;
}

interface TowerCommentsProps {
  towerId: string;
  towerName?: string;
}

export default function TowerComments({ towerId, towerName }: TowerCommentsProps) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);

  // Load comments when component mounts
  useEffect(() => {
    loadComments();
  }, [towerId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_visits')
        .select('id, rating, comment, user_id')
        .eq('tower_id', towerId)
        .not('comment', 'is', null)
        .not('comment', 'eq', '')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }

      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      // Check if user already has a visit record for this tower
      const { data: existingVisits, error: checkError } = await supabase
        .from('user_visits')
        .select('id')
        .eq('tower_id', towerId)
        .eq('user_id', user.id);

      if (checkError) {
        console.error('Error checking existing visit:', checkError);
        alert('Failed to submit comment. Please try again.');
        return;
      }

      const existingVisit = existingVisits && existingVisits.length > 0 ? existingVisits[0] : null;

      let result;
      if (existingVisit) {
        // Update existing visit with comment and rating
        result = await supabase
          .from('user_visits')
          .update({
            comment: newComment.trim(),
            rating: newRating
          })
          .eq('id', existingVisit.id)
          .select('id, rating, comment, user_id')
          .single();
      } else {
        // Create new visit record with comment and rating
        result = await supabase
          .from('user_visits')
          .insert({
            tower_id: towerId,
            user_id: user.id,
            visited_at: new Date().toISOString(),
            comment: newComment.trim(),
            rating: newRating
          })
          .select('id, rating, comment, user_id')
          .single();
      }

      const { data, error } = result;

      if (error) {
        console.error('Error submitting comment:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert(`Failed to submit comment: ${error.message || 'Please try again.'}`);
        return;
      }

      console.log('Comment submitted successfully:', data);

      // Reload all comments to get the updated list
      await loadComments();
      setNewComment('');
      setNewRating(5);
      setShowCommentForm(false);
    } catch (error) {
      console.error('Error submitting comment (caught):', error);
      console.error('Error type:', error instanceof Error ? error.message : JSON.stringify(error));
      alert(`Failed to submit comment: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditComment(comment.comment);
    setEditRating(comment.rating);
    setShowCommentForm(false); // Close add form if open
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditComment('');
    setEditRating(5);
  };

  const updateComment = async () => {
    if (!user || !editComment.trim() || editingCommentId === null) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_visits')
        .update({
          comment: editComment.trim(),
          rating: editRating
        })
        .eq('id', editingCommentId)
        .eq('user_id', user.id); // Ensure user can only edit their own comments

      if (error) {
        console.error('Error updating comment:', error);
        alert(`Failed to update comment: ${error.message || 'Please try again.'}`);
        return;
      }

      // Reload comments to get the updated list
      await loadComments();
      cancelEditing();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert(`Failed to update comment: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } transition-transform`}
            disabled={!interactive}
          >
            <svg
              className={`w-5 h-5 ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  const averageRating = comments.length > 0 
    ? comments.reduce((sum, comment) => sum + comment.rating, 0) / comments.length 
    : 0;

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Reviews & Ratings</h3>
        
        {comments.length > 0 && (
          <div className="flex items-center space-x-3 mb-4">
            {renderStars(Math.round(averageRating))}
            <span className="text-sm text-gray-600">
              {averageRating.toFixed(1)} out of 5 ({comments.length} {comments.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {user && (
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showCommentForm ? 'Cancel' : 'Add Review'}
          </button>
        )}

        {!user && (
          <p className="text-gray-600 text-sm">
            Please log in to add a review.
          </p>
        )}
      </div>

      {/* Comment Form */}
      {showCommentForm && user && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3">Add Your Review</h4>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Rating</label>
            {renderStars(newRating, true, setNewRating)}
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Comment</label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Share your thoughts about ${towerName}...`}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {newComment.length}/500 characters
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={submitComment}
              disabled={!newComment.trim() || submitting}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              onClick={() => setShowCommentForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-4">
              {editingCommentId === comment.id ? (
                // Edit Form
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-3">Edit Your Review</h4>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    {renderStars(editRating, true, setEditRating)}
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Comment</label>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      placeholder={`Share your thoughts about ${towerName}...`}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {editComment.length}/500 characters
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={updateComment}
                      disabled={!editComment.trim() || submitting}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Updating...' : 'Update Review'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display Comment
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {renderStars(comment.rating)}
                      <span className="text-sm text-gray-600">
                        Visitor Review
                      </span>
                    </div>
                    {user && user.id === comment.user_id && (
                      <button
                        onClick={() => startEditing(comment)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700">{comment.comment}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}