import React from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { SocialPost } from '../../types';
import { api } from '../../services/api';

type Vote = -1 | 0 | 1;

const formatScore = (n: number) => {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

/**
 * Vote Reddit : upvote / downvote, un nouveau clic sur le même vote l'annule.
 * Le vote initial vient de Reddit (extra.userVote) quand la session est connectée.
 */
export const RedditVoteButtons: React.FC<{ post: SocialPost; size?: 'sm' | 'md' }> = ({ post, size = 'sm' }) => {
  const initialVote = (post.extra?.userVote ?? 0) as Vote;
  const [vote, setVote] = React.useState<Vote>(initialVote);
  const [score, setScore] = React.useState<number>(post.stats.likes || 0);
  const [isSending, setIsSending] = React.useState(false);

  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  const sendVote = async (e: React.MouseEvent, direction: 1 | -1) => {
    e.stopPropagation();
    if (isSending) return;

    const previousVote = vote;
    const previousScore = score;
    const nextVote: Vote = vote === direction ? 0 : direction;

    // Mise à jour optimiste, annulée si Reddit refuse le vote
    setVote(nextVote);
    setScore(previousScore + (nextVote - previousVote));
    setIsSending(true);

    try {
      const res = await api.postAction(post.platform, post.id, 'like', { value: nextVote, postUrl: post.postUrl });
      if (!res.success) throw new Error(res.message || 'Vote refusé');
    } catch (err) {
      console.error('[RedditVote] Erreur vote :', err);
      setVote(previousVote);
      setScore(previousScore);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => sendVote(e, 1)}
        disabled={isSending}
        className={`p-0.5 rounded-md transition-colors hover:bg-[#ff4500]/10 ${vote === 1 ? 'text-[#ff4500]' : 'hover:text-[#ff4500]'}`}
        title={vote === 1 ? 'Annuler le vote positif' : 'Vote positif (Upvote)'}
      >
        <ArrowBigUp className={`${iconClass} ${vote === 1 ? 'fill-current' : ''}`} />
      </button>
      <span
        className={`min-w-[1.5rem] text-center font-semibold ${vote === 1 ? 'text-[#ff4500]' : vote === -1 ? 'text-[#7193ff]' : ''}`}
      >
        {formatScore(score)}
      </span>
      <button
        onClick={(e) => sendVote(e, -1)}
        disabled={isSending}
        className={`p-0.5 rounded-md transition-colors hover:bg-[#7193ff]/10 ${vote === -1 ? 'text-[#7193ff]' : 'hover:text-[#7193ff]'}`}
        title={vote === -1 ? 'Annuler le vote négatif' : 'Vote négatif (Downvote)'}
      >
        <ArrowBigDown className={`${iconClass} ${vote === -1 ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
