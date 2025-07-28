import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Share2, Copy, Bookmark } from 'lucide-react';
import { motivationService, type DailyQuote } from '@/services/motivationService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DailyQuoteCardProps {
  className?: string;
}

export const DailyQuoteCard: React.FC<DailyQuoteCardProps> = ({ className }) => {
  const { user } = useAuth();
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadDailyQuote();
  }, []);

  const loadDailyQuote = async () => {
    try {
      const dailyQuote = await motivationService.getDailyQuote();
      setQuote(dailyQuote);
    } catch (error) {
      console.error('Error loading daily quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!user || !quote) return;

    const success = await motivationService.addPersonalMotivation(user.id, {
      content_type: 'quote',
      title: 'Daily Quote',
      content: quote.quote_text,
      source: quote.author,
      tags: quote.tags,
      is_favorite: false
    });

    if (success) {
      setIsSaved(true);
    }
  };

  const handleCopyQuote = async () => {
    if (!quote) return;

    const text = `"${quote.quote_text}"${quote.author ? ` - ${quote.author}` : ''}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Quote copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy quote');
    }
  };

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No daily quote available</p>
        </CardContent>
      </Card>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      recovery: 'bg-primary/10 text-primary',
      mindfulness: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
      strength: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
      hope: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      gratitude: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
    };
    return colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card className={`bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary">Daily Inspiration</h3>
            <Badge className={getCategoryColor(quote.category)}>
              {quote.category}
            </Badge>
          </div>

          {/* Quote */}
          <blockquote className="text-lg font-medium leading-relaxed text-foreground">
            "{quote.quote_text}"
          </blockquote>

          {/* Author */}
          {quote.author && (
            <p className="text-sm text-muted-foreground italic">
              — {quote.author}
            </p>
          )}

          {/* Tags */}
          {quote.tags && quote.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {quote.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyQuote}
              className="flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveToLibrary}
                disabled={isSaved}
                className="flex items-center gap-1"
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Daily Inspiration',
                    text: `"${quote.quote_text}"${quote.author ? ` - ${quote.author}` : ''}`
                  });
                }
              }}
              className="flex items-center gap-1"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};