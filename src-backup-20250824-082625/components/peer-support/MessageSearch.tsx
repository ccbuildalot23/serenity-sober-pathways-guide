import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Download, Bookmark } from 'lucide-react';
import { useRealtimePeerChat } from '@/hooks/useRealtimePeerChat';

interface SearchResult {
  id: string;
  message_text: string;
  sender_type: string;
  created_at: string;
  rank: number;
}

interface MessageSearchProps {
  sessionId: string;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ sessionId }) => {
  const [_searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [_dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [senderFilter, setSenderFilter] = useState<'all' | 'user' | 'supporter'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const { searchMessages } = useRealtimePeerChat({
    sessionId,
  });

  const _handleSearch = async () => {
    if (!_searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchMessages(_searchQuery);
      
      // Apply filters
      let _filteredResults = results;
      
      if (_dateFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (_dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        _filteredResults = _filteredResults.filter(result => 
          new Date(result.created_at) >= filterDate
        );
      }
      
      if (senderFilter !== 'all') {
        _filteredResults = _filteredResults.filter(result => 
          result.sender_type === senderFilter
        );
      }
      
      setSearchResults(_filteredResults);
    } catch (_error) {
      console._error('Search failed:', _error);
    } finally {
      setIsSearching(false);
    }
  };

  const exportConversation = async () => {
    // Simple CSV export - in a real app, you'd want more sophisticated export
    try {
      const allMessages = await searchMessages(''); // Get all messages
      
      const csvContent = [
        'Timestamp,Sender,Message',
        ...allMessages.map(msg => 
          `"${msg.created_at}","${msg.sender_type}","${msg.message_text.replace(/"/g, '""')}"`
        )
      ].join('\n');
      
      const _blob = new Blob([csvContent], { type: 'text/csv' });
      const _url = window.URL.createObjectURL(_blob);
      const a = document.createElement('a');
      a.href = _url;
      a.download = `conversation-${sessionId}.csv`;
      a.click();
      window.URL.revokeObjectURL(_url);
    } catch (_error) {
      console._error('Export failed:', _error);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  useEffect(() => {
    if (_searchQuery) {
      const _debounceTimer = setTimeout(_handleSearch, 300);
      return () => clearTimeout(_debounceTimer);
    } else {
      setSearchResults([]);
    }
  }, [_searchQuery, _dateFilter, senderFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="w-4 h-4 mr-2" />
          Search Messages
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Conversation History
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Controls */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search messages..."
                value={_searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={_dateFilter} onValueChange={setDateFilter as any}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={senderFilter} onValueChange={setSenderFilter as any}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Senders</SelectItem>
                <SelectItem value="user">You</SelectItem>
                <SelectItem value="supporter">Supporter</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportConversation}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          
          {/* Search Results */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isSearching ? (
              <div className="text-center py-8 text-gray-500">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  Found {searchResults.length} message{searchResults.length !== 1 ? 's' : ''}
                </div>
                {searchResults.map((result) => (
                  <Card key={result.id} className="p-3 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={result.sender_type === 'user' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {result.sender_type === 'user' ? 'You' : 'Supporter'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(result.created_at).toLocaleString()}
                          </span>
                          <div className="flex text-yellow-400">
                            {Array.from({ length: Math.min(5, Math.ceil(result.rank * 10)) }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-900">
                          {highlightText(result.message_text, _searchQuery)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </>
            ) : _searchQuery ? (
              <div className="text-center py-8 text-gray-500">
                No messages found matching "{_searchQuery}"
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a search term to find messages</p>
                <p className="text-sm mt-2">
                  Search through your conversation history, filter by date or sender,
                  and export conversations for your records.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};