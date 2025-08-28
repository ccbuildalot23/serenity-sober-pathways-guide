import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, Searchbar, FAB, Badge, Avatar} from 'react-native-paper';
import {format, isToday, isYesterday, differenceInMinutes} from 'date-fns';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {MessagingService} from '@services/messaging';
import {EncryptionService} from '@services/encryption';
import {WebSocketService} from '@services/websocket';
import {HapticService} from '@services/haptic';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';

interface Conversation {
  id: string;
  type: 'peer' | 'group' | 'provider' | 'crisis';
  name: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

interface Participant {
  id: string;
  name: string;
  role: 'patient' | 'provider' | 'supporter' | 'peer';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'crisis_alert' | 'system';
  isEncrypted: boolean;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
}

interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

const MessagingScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, profile} = useAuth();
  const {colors} = useTheme();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'peer' | 'provider' | 'group'>('all');
  const [unreadTotal, setUnreadTotal] = useState(0);

  const wsRef = useRef<WebSocketService | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadConversations();
      connectWebSocket();
      
      return () => {
        disconnectWebSocket();
      };
    }, [])
  );

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery, activeTab]);

  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    setUnreadTotal(total);
  }, [conversations]);

  const connectWebSocket = async () => {
    try {
      wsRef.current = new WebSocketService(user?.id!);
      
      await wsRef.current.connect();
      
      wsRef.current.onMessage((data) => {
        handleWebSocketMessage(data);
      });
      
      wsRef.current.onUserStatusChange((userId, status) => {
        updateUserStatus(userId, status);
      });
      
      wsRef.current.onTyping((conversationId, userId, isTyping) => {
        handleTypingIndicator(conversationId, userId, isTyping);
      });
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'new_message':
        handleNewMessage(data.message);
        break;
      case 'message_status_update':
        updateMessageStatus(data.messageId, data.status);
        break;
      case 'conversation_updated':
        updateConversation(data.conversation);
        break;
      case 'crisis_alert':
        handleCrisisAlert(data);
        break;
    }
  };

  const handleNewMessage = async (message: Message) => {
    try {
      // Decrypt message if encrypted
      if (message.isEncrypted) {
        message.content = await EncryptionService.decrypt(message.content, user?.id!);
      }
      
      // Update conversations
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              unreadCount: conv.unreadCount + 1,
              updatedAt: message.timestamp,
            };
          }
          return conv;
        });
      });
      
      // Show notification if app is in background
      // Notification will be handled by the notification service
      
      // Haptic feedback
      HapticService.impact('light');
      
    } catch (error) {
      console.error('Failed to handle new message:', error);
    }
  };

  const updateMessageStatus = (messageId: string, status: string) => {
    // Update message status in conversations
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.lastMessage?.id === messageId) {
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              status: status as Message['status'],
            },
          };
        }
        return conv;
      });
    });
  };

  const updateConversation = (updatedConversation: Conversation) => {
    setConversations(prevConversations => {
      const existingIndex = prevConversations.findIndex(conv => conv.id === updatedConversation.id);
      if (existingIndex >= 0) {
        const updated = [...prevConversations];
        updated[existingIndex] = updatedConversation;
        return updated;
      } else {
        return [updatedConversation, ...prevConversations];
      }
    });
  };

  const updateUserStatus = (userId: string, status: 'online' | 'offline' | 'away') => {
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        const updatedParticipants = conv.participants.map(participant => {
          if (participant.id === userId) {
            return {
              ...participant,
              isOnline: status === 'online',
              lastSeen: status === 'offline' ? new Date().toISOString() : participant.lastSeen,
            };
          }
          return participant;
        });
        
        return {
          ...conv,
          participants: updatedParticipants,
          status: conv.type === 'peer' && conv.participants.length === 2 ? status : conv.status,
        };
      });
    });
  };

  const handleTypingIndicator = (conversationId: string, userId: string, isTyping: boolean) => {
    // Handle typing indicators - could show in conversation list or chat screen
    console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'} in conversation ${conversationId}`);
  };

  const handleCrisisAlert = (data: any) => {
    Alert.alert(
      'Crisis Alert',
      `${data.userName} has triggered a crisis alert. Would you like to reach out?`,
      [
        {text: 'Later', style: 'cancel'},
        {
          text: 'Send Message',
          onPress: () => navigation.navigate('ChatRoom', {
            roomId: data.conversationId,
            roomName: data.userName,
          }),
        },
      ]
    );
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await MessagingService.getConversations(user?.id!);
      
      // Sort by last message timestamp
      const sortedConversations = data.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setConversations(sortedConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      Alert.alert('Error', 'Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const filterConversations = () => {
    let filtered = conversations;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(conv => conv.type === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.name.toLowerCase().includes(query) ||
        conv.lastMessage?.content.toLowerCase().includes(query) ||
        conv.participants.some(p => p.name.toLowerCase().includes(query))
      );
    }

    setFilteredConversations(filtered);
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      // Mark conversation as read
      await MessagingService.markAsRead(conversation.id, user?.id!);
      
      // Update local state
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === conversation.id ? {...conv, unreadCount: 0} : conv
        )
      );

      // Navigate to chat room
      navigation.navigate('ChatRoom', {
        roomId: conversation.id,
        roomName: conversation.name,
        isGroup: conversation.type === 'group',
      });
      
      HapticService.impact('light');
    } catch (error) {
      console.error('Failed to open conversation:', error);
    }
  };

  const createNewConversation = () => {
    Alert.alert(
      'New Conversation',
      'What type of conversation would you like to start?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Peer Support',
          onPress: () => navigation.navigate('PeerSupport'),
        },
        {
          text: 'Provider Chat',
          onPress: () => navigation.navigate('ProviderList'),
        },
        {
          text: 'Support Group',
          onPress: () => navigation.navigate('SupportGroups'),
        },
      ]
    );
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const getConversationIcon = (conversation: Conversation) => {
    switch (conversation.type) {
      case 'peer':
        return 'people';
      case 'provider':
        return 'medical-services';
      case 'group':
        return 'group';
      case 'crisis':
        return 'warning';
      default:
        return 'chat';
    }
  };

  const getStatusDot = (conversation: Conversation) => {
    if (conversation.type === 'peer' && conversation.participants.length === 2) {
      const otherUser = conversation.participants.find(p => p.id !== user?.id);
      if (otherUser?.isOnline) {
        return <View style={[styles.statusDot, styles.onlineStatus]} />;
      }
    }
    return null;
  };

  const renderConversationItem = ({item: conversation}: {item: Conversation}) => (
    <TouchableOpacity
      style={[styles.conversationItem, {backgroundColor: colors.surface}]}
      onPress={() => openConversation(conversation)}
      activeOpacity={0.7}
    >
      <View style={styles.conversationContent}>
        <View style={styles.avatarContainer}>
          {conversation.avatar ? (
            <Avatar.Image size={50} source={{uri: conversation.avatar}} />
          ) : (
            <Avatar.Icon
              size={50}
              icon={getConversationIcon(conversation)}
              style={{backgroundColor: colors.primary}}
            />
          )}
          {getStatusDot(conversation)}
          {conversation.isEncrypted && (
            <View style={[styles.encryptionBadge, {backgroundColor: colors.accent}]}>
              <Icon name="lock" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[
                styles.conversationName, 
                {color: colors.text.primary},
                conversation.unreadCount > 0 && styles.unreadName
              ]}
              numberOfLines={1}
            >
              {conversation.name}
            </Text>
            
            {conversation.lastMessage && (
              <View style={styles.messageTime}>
                <Text style={[styles.timeText, {color: colors.text.secondary}]}>
                  {formatMessageTime(conversation.lastMessage.timestamp)}
                </Text>
                {conversation.unreadCount > 0 && (
                  <Badge size={20} style={{backgroundColor: colors.primary}}>
                    {conversation.unreadCount}
                  </Badge>
                )}
              </View>
            )}
          </View>

          {conversation.lastMessage && (
            <View style={styles.lastMessage}>
              <Text 
                style={[
                  styles.messagePreview, 
                  {color: colors.text.secondary},
                  conversation.unreadCount > 0 && {color: colors.text.primary, fontWeight: '500'}
                ]}
                numberOfLines={1}
              >
                {conversation.lastMessage.type === 'text' 
                  ? conversation.lastMessage.content
                  : getMessageTypeDisplay(conversation.lastMessage.type)
                }
              </Text>
              
              {conversation.lastMessage.status && conversation.lastMessage.senderId === user?.id && (
                <Icon
                  name={getStatusIcon(conversation.lastMessage.status)}
                  size={14}
                  color={colors.text.secondary}
                  style={styles.messageStatusIcon}
                />
              )}
            </View>
          )}

          {conversation.type === 'group' && (
            <Text style={[styles.participantCount, {color: colors.text.secondary}]}>
              {conversation.participants.length} members
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getMessageTypeDisplay = (type: Message['type']) => {
    switch (type) {
      case 'image':
        return '📷 Photo';
      case 'voice':
        return '🎵 Voice message';
      case 'crisis_alert':
        return '⚠️ Crisis alert';
      case 'system':
        return 'System message';
      default:
        return 'Message';
    }
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return 'access-time';
      case 'sent':
        return 'check';
      case 'delivered':
        return 'done-all';
      case 'read':
        return 'done-all';
      default:
        return 'check';
    }
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, {backgroundColor: colors.surface}]}>
      {(['all', 'peer', 'provider', 'group'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && {backgroundColor: colors.primary},
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[
              styles.tabText,
              {color: activeTab === tab ? '#FFFFFF' : colors.text.secondary},
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
          Messages
        </Text>
        {unreadTotal > 0 && (
          <Badge size={24} style={{backgroundColor: colors.primary}}>
            {unreadTotal}
          </Badge>
        )}
      </View>

      <Searchbar
        placeholder="Search conversations..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchbar, {backgroundColor: colors.surface}]}
        inputStyle={{color: colors.text.primary}}
        placeholderTextColor={colors.text.secondary}
      />

      {renderTabs()}

      {filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationsList}
        />
      ) : (
        <EmptyState
          icon="chat"
          title="No conversations yet"
          message={searchQuery 
            ? "No conversations match your search."
            : "Start a conversation with peers or providers to begin your support journey."
          }
          actionText="Start Conversation"
          onAction={createNewConversation}
        />
      )}

      <FAB
        style={[styles.fab, {backgroundColor: colors.primary}]}
        icon="chat"
        onPress={createNewConversation}
        color="#FFFFFF"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  conversationsList: {
    paddingBottom: 80,
  },
  conversationItem: {
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    elevation: 1,
  },
  conversationContent: {
    flexDirection: 'row',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineStatus: {
    backgroundColor: '#4CAF50',
  },
  encryptionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  unreadName: {
    fontWeight: 'bold',
  },
  messageTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 12,
  },
  lastMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messagePreview: {
    fontSize: 14,
    flex: 1,
  },
  messageStatusIcon: {
    marginLeft: 4,
  },
  participantCount: {
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default MessagingScreen;