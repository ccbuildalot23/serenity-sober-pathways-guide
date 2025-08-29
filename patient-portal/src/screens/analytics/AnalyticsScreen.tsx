import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, Chip, Button} from 'react-native-paper';
import {LineChart, BarChart, PieChart, ProgressChart} from 'react-native-chart-kit';
import {format, subDays, subWeeks, subMonths, startOfDay, endOfDay} from 'date-fns';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {AnalyticsService} from '@services/analytics';
import {HapticService} from '@services/haptic';
import MoodTrendChart from '@components/analytics/MoodTrendChart';
import SleepAnalysisChart from '@components/analytics/SleepAnalysisChart';
import MedicationAdherenceChart from '@components/analytics/MedicationAdherenceChart';
import TriggerPatternsChart from '@components/analytics/TriggerPatternsChart';
import LoadingSpinner from '@components/common/LoadingSpinner';

const {width: screenWidth} = Dimensions.get('window');

interface AnalyticsData {
  moodTrends: {
    dates: string[];
    values: number[];
    average: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  anxietyLevels: {
    dates: string[];
    values: number[];
    average: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  sleepPatterns: {
    dates: string[];
    hours: number[];
    quality: number[];
    averageHours: number;
    averageQuality: number;
  };
  medicationAdherence: {
    dates: string[];
    adherenceRates: number[];
    overallAdherence: number;
    streakDays: number;
  };
  checkinFrequency: {
    total: number;
    thisWeek: number;
    streak: number;
    completionRate: number;
  };
  triggerPatterns: {
    triggers: string[];
    frequencies: number[];
    timePatterns: {[key: string]: number};
    seasonalPatterns: {[key: string]: number};
  };
  progressMilestones: {
    totalDays: number;
    consecutiveDays: number;
    improvementScore: number;
    achievements: Achievement[];
  };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  dateAchieved: string;
  category: 'mood' | 'sleep' | 'medication' | 'checkin' | 'general';
}

const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const {colors} = useTheme();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months' | '6months'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'mood' | 'anxiety' | 'sleep' | 'medication'>('mood');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = subWeeks(endDate, 1);
          break;
        case 'month':
          startDate = subMonths(endDate, 1);
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case '6months':
          startDate = subMonths(endDate, 6);
          break;
      }
      
      const data = await AnalyticsService.getAnalytics(user?.id!, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'trending-up';
      case 'declining':
        return 'trending-down';
      case 'stable':
        return 'trending-flat';
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return '#4CAF50';
      case 'declining':
        return '#F44336';
      case 'stable':
        return '#FF9800';
    }
  };

  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    return (
      <View style={styles.overviewGrid}>
        <Card style={[styles.overviewCard, {backgroundColor: colors.surface}]} elevation={2}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="sentiment-satisfied" size={24} color={colors.primary} />
              <Icon 
                name={getTrendIcon(analyticsData.moodTrends.trend)} 
                size={16} 
                color={getTrendColor(analyticsData.moodTrends.trend)} 
              />
            </View>
            <Text style={[styles.cardValue, {color: colors.text.primary}]}>
              {analyticsData.moodTrends.average.toFixed(1)}
            </Text>
            <Text style={[styles.cardLabel, {color: colors.text.secondary}]}>
              Avg Mood
            </Text>
          </View>
        </Card>

        <Card style={[styles.overviewCard, {backgroundColor: colors.surface}]} elevation={2}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="psychology" size={24} color={colors.secondary} />
              <Icon 
                name={getTrendIcon(analyticsData.anxietyLevels.trend)} 
                size={16} 
                color={getTrendColor(analyticsData.anxietyLevels.trend)} 
              />
            </View>
            <Text style={[styles.cardValue, {color: colors.text.primary}]}>
              {analyticsData.anxietyLevels.average.toFixed(1)}
            </Text>
            <Text style={[styles.cardLabel, {color: colors.text.secondary}]}>
              Avg Anxiety
            </Text>
          </View>
        </Card>

        <Card style={[styles.overviewCard, {backgroundColor: colors.surface}]} elevation={2}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="bedtime" size={24} color={colors.accent} />
              <Text style={[styles.trendText, {color: colors.text.secondary}]}>
                {analyticsData.sleepPatterns.averageHours.toFixed(1)}h
              </Text>
            </View>
            <Text style={[styles.cardValue, {color: colors.text.primary}]}>
              {analyticsData.sleepPatterns.averageQuality.toFixed(1)}
            </Text>
            <Text style={[styles.cardLabel, {color: colors.text.secondary}]}>
              Sleep Quality
            </Text>
          </View>
        </Card>

        <Card style={[styles.overviewCard, {backgroundColor: colors.surface}]} elevation={2}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="medication" size={24} color="#4CAF50" />
              <Text style={[styles.trendText, {color: '#4CAF50'}]}>
                {analyticsData.medicationAdherence.streakDays}d
              </Text>
            </View>
            <Text style={[styles.cardValue, {color: colors.text.primary}]}>
              {Math.round(analyticsData.medicationAdherence.overallAdherence * 100)}%
            </Text>
            <Text style={[styles.cardLabel, {color: colors.text.secondary}]}>
              Adherence
            </Text>
          </View>
        </Card>
      </View>
    );
  };

  const renderTimeRangeSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRangeContainer}>
      {(['week', 'month', '3months', '6months'] as const).map((range) => (
        <Chip
          key={range}
          mode={timeRange === range ? 'flat' : 'outlined'}
          selected={timeRange === range}
          onPress={() => {
            setTimeRange(range);
            HapticService.impact('light');
          }}
          style={[
            styles.timeRangeChip,
            timeRange === range && {backgroundColor: colors.primary},
          ]}
          textStyle={{
            color: timeRange === range ? '#FFFFFF' : colors.text.secondary,
          }}
        >
          {range === '3months' ? '3 Months' : range === '6months' ? '6 Months' : range.charAt(0).toUpperCase() + range.slice(1)}
        </Chip>
      ))}
    </ScrollView>
  );

  const renderMainChart = () => {
    if (!analyticsData) return null;

    const chartData = {
      labels: analyticsData[selectedMetric === 'medication' ? 'medicationAdherence' : `${selectedMetric}${selectedMetric === 'sleep' ? 'Patterns' : selectedMetric === 'mood' ? 'Trends' : 'Levels'}`].dates.map(date => 
        format(new Date(date), 'MMM dd')
      ).slice(-7), // Show last 7 data points
      datasets: [{
        data: selectedMetric === 'sleep' 
          ? analyticsData.sleepPatterns.quality.slice(-7)
          : selectedMetric === 'medication'
          ? analyticsData.medicationAdherence.adherenceRates.slice(-7).map(rate => rate * 100)
          : analyticsData[selectedMetric === 'mood' ? 'moodTrends' : 'anxietyLevels'].values.slice(-7),
        color: (opacity = 1) => {
          const colors_map = {
            mood: colors.primary,
            anxiety: colors.secondary,
            sleep: colors.accent,
            medication: '#4CAF50',
          };
          return colors_map[selectedMetric];
        },
        strokeWidth: 3,
      }],
    };

    const chartConfig = {
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      color: (opacity = 1) => colors.text.primary,
      labelColor: (opacity = 1) => colors.text.secondary,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary,
      },
      decimalPlaces: 1,
    };

    return (
      <Card style={[styles.chartCard, {backgroundColor: colors.surface}]} elevation={2}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, {color: colors.text.primary}]}>
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends
          </Text>
          
          <View style={styles.metricSelector}>
            {(['mood', 'anxiety', 'sleep', 'medication'] as const).map((metric) => (
              <TouchableOpacity
                key={metric}
                style={[
                  styles.metricButton,
                  selectedMetric === metric && {backgroundColor: colors.primary},
                ]}
                onPress={() => {
                  setSelectedMetric(metric);
                  HapticService.impact('light');
                }}
              >
                <Text
                  style={[
                    styles.metricButtonText,
                    {color: selectedMetric === metric ? '#FFFFFF' : colors.text.secondary},
                  ]}
                >
                  {metric.charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <LineChart
          data={chartData}
          width={screenWidth - 64}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </Card>
    );
  };

  const renderProgressMilestones = () => {
    if (!analyticsData?.progressMilestones) return null;

    return (
      <Card style={[styles.milestonesCard, {backgroundColor: colors.surface}]} elevation={2}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, {color: colors.text.primary}]}>
            Progress Milestones
          </Text>
        </View>

        <View style={styles.milestonesGrid}>
          <View style={styles.milestoneItem}>
            <Text style={[styles.milestoneNumber, {color: colors.primary}]}>
              {analyticsData.progressMilestones.totalDays}
            </Text>
            <Text style={[styles.milestoneLabel, {color: colors.text.secondary}]}>
              Total Days
            </Text>
          </View>

          <View style={styles.milestoneItem}>
            <Text style={[styles.milestoneNumber, {color: colors.secondary}]}>
              {analyticsData.progressMilestones.consecutiveDays}
            </Text>
            <Text style={[styles.milestoneLabel, {color: colors.text.secondary}]}>
              Streak
            </Text>
          </View>

          <View style={styles.milestoneItem}>
            <Text style={[styles.milestoneNumber, {color: colors.accent}]}>
              {analyticsData.progressMilestones.improvementScore}%
            </Text>
            <Text style={[styles.milestoneLabel, {color: colors.text.secondary}]}>
              Improvement
            </Text>
          </View>
        </View>

        {analyticsData.progressMilestones.achievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={[styles.achievementsTitle, {color: colors.text.primary}]}>
              Recent Achievements
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {analyticsData.progressMilestones.achievements.slice(0, 5).map((achievement) => (
                <View key={achievement.id} style={[styles.achievementItem, {backgroundColor: colors.background}]}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={[styles.achievementTitle, {color: colors.text.primary}]}>
                    {achievement.title}
                  </Text>
                  <Text style={[styles.achievementDate, {color: colors.text.secondary}]}>
                    {format(new Date(achievement.dateAchieved), 'MMM dd')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>
    );
  };

  const renderInsights = () => {
    if (!analyticsData) return null;

    const insights = AnalyticsService.generateInsights(analyticsData);

    return (
      <Card style={[styles.insightsCard, {backgroundColor: colors.surface}]} elevation={2}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, {color: colors.text.primary}]}>
            Insights & Recommendations
          </Text>
        </View>

        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <Icon name={insight.icon} size={24} color={insight.color} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, {color: colors.text.primary}]}>
                {insight.title}
              </Text>
              <Text style={[styles.insightDescription, {color: colors.text.secondary}]}>
                {insight.description}
              </Text>
              {insight.actionText && (
                <Button
                  mode="text"
                  onPress={insight.action}
                  style={styles.insightAction}
                >
                  {insight.actionText}
                </Button>
              )}
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.quickActionItem, {backgroundColor: colors.surface}]}
        onPress={() => navigation.navigate('MoodTrends')}
      >
        <Icon name="trending-up" size={24} color={colors.primary} />
        <Text style={[styles.quickActionText, {color: colors.text.primary}]}>
          Mood Trends
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionItem, {backgroundColor: colors.surface}]}
        onPress={() => navigation.navigate('SleepAnalysis')}
      >
        <Icon name="bedtime" size={24} color={colors.accent} />
        <Text style={[styles.quickActionText, {color: colors.text.primary}]}>
          Sleep Analysis
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionItem, {backgroundColor: colors.surface}]}
        onPress={() => navigation.navigate('TriggerPatterns')}
      >
        <Icon name="psychology" size={24} color={colors.secondary} />
        <Text style={[styles.quickActionText, {color: colors.text.primary}]}>
          Trigger Patterns
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
          Progress Analytics
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {renderTimeRangeSelector()}
        {renderOverviewCards()}
        {renderMainChart()}
        {renderProgressMilestones()}
        {renderInsights()}
        {renderQuickActions()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  timeRangeContainer: {
    marginBottom: 16,
  },
  timeRangeChip: {
    marginRight: 8,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  metricButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
  },
  milestonesCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  milestonesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  milestoneItem: {
    alignItems: 'center',
  },
  milestoneNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  milestoneLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  achievementsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  achievementItem: {
    width: 80,
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 8,
  },
  insightsCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  insightItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  insightAction: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AnalyticsScreen;