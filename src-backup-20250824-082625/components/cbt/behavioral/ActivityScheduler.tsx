
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Clock, MapPin, Users, Trash2 } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

interface Activity {
  id: string;
  title: string;
  description: string;
  category: 'self-care' | 'social' | 'productive' | 'enjoyable' | 'recovery';
  duration: number;
  location: string;
  participants: string;
}

interface ScheduledActivity extends Activity {
  date: Date;
  time: string;
  completed: boolean;
}

const ActivityScheduler: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      title: 'Morning Meditation',
      description: 'Start the day with mindfulness',
      category: 'self-care',
      duration: 15,
      location: 'Home',
      participants: 'Solo'
    },
    {
      id: '2',
      title: 'Call Sponsor',
      description: 'Weekly check-in call',
      category: 'recovery',
      duration: 30,
      location: 'Home',
      participants: 'Sponsor'
    },
    {
      id: '3',
      title: 'Nature Walk',
      description: 'Fresh air and exercise',
      category: 'enjoyable',
      duration: 45,
      location: 'Park',
      participants: 'Solo or Friend'
    }
  ]);

  const [schedule, setSchedule] = useState<ScheduledActivity[]>([]);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    title: '',
    description: '',
    category: 'self-care',
    duration: 30,
    location: '',
    participants: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(currentWeek), i)
  );

  const timeSlots = [
    '6:00', '7:00', '8:00', '9:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00'
  ];

  const categoryColors = {
    'self-care': 'bg-blue-100 text-blue-800 border-blue-200',
    'social': 'bg-purple-100 text-purple-800 border-purple-200',
    'productive': 'bg-green-100 text-green-800 border-green-200',
    'enjoyable': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'recovery': 'bg-red-100 text-red-800 border-red-200'
  };

  const addActivity = () => {
    if (newActivity.title && newActivity.description) {
      const activity: Activity = {
        id: Date.now().toString(),
        title: newActivity.title,
        description: newActivity.description || '',
        category: newActivity.category || 'self-care',
        duration: newActivity.duration || 30,
        location: newActivity.location || '',
        participants: newActivity.participants || ''
      };
      
      setActivities([...activities, activity]);
      setNewActivity({
        title: '',
        description: '',
        category: 'self-care',
        duration: 30,
        location: '',
        participants: ''
      });
      setShowAddForm(false);
    }
  };

  const scheduleActivity = (activity: Activity, date: Date, time: string) => {
    const scheduledActivity: ScheduledActivity = {
      ...activity,
      date,
      time,
      completed: false
    };
    
    setSchedule([...schedule, scheduledActivity]);
  };

  const getScheduledActivities = (date: Date, time: string) => {
    return schedule.filter(activity => 
      format(activity.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
      activity.time === time
    );
  };

  const toggleComplete = (activityId: string) => {
    setSchedule(schedule.map(activity =>
      activity.id === activityId
        ? { ...activity, completed: !activity.completed }
        : activity
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Activity Scheduler</h3>
          <p className="text-gray-600">Drag activities to schedule them throughout your week</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Activity Title</Label>
                <Input
                  id="title"
                  value={newActivity.title || ''}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                  placeholder="e.g., Morning Jog"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={newActivity.category || 'self-care'}
                  onChange={(e) => setNewActivity({...newActivity, category: e.target.value as Activity['category']})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="self-care">Self-Care</option>
                  <option value="social">Social</option>
                  <option value="productive">Productive</option>
                  <option value="enjoyable">Enjoyable</option>
                  <option value="recovery">Recovery</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newActivity.description || ''}
                onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                placeholder="Brief description of the activity"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newActivity.duration || 30}
                  onChange={(e) => setNewActivity({...newActivity, duration: parseInt(e.target.value)})}
                  min="5"
                  max="480"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newActivity.location || ''}
                  onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                  placeholder="Where will this happen?"
                />
              </div>
              <div>
                <Label htmlFor="participants">Participants</Label>
                <Input
                  id="participants"
                  value={newActivity.participants || ''}
                  onChange={(e) => setNewActivity({...newActivity, participants: e.target.value})}
                  placeholder="Who will be involved?"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={addActivity}>Add Activity</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Bank */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Bank</CardTitle>
          <p className="text-gray-600">Click on an activity to schedule it</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${categoryColors[activity.category]}`}
                draggable
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{activity.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {activity.category}
                  </Badge>
                </div>
                <p className="text-sm mb-2">{activity.description}</p>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {activity.duration}m
                  </span>
                  {activity.location && (
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {activity.location}
                    </span>
                  )}
                  {activity.participants && (
                    <span className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {activity.participants}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
            >
              Previous Week
            </Button>
            <span className="font-medium">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
            >
              Next Week
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-2 min-w-full">
              {/* Header */}
              <div className="text-center font-medium p-2">Time</div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="text-center font-medium p-2">
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-sm text-gray-500">{format(day, 'd')}</div>
                </div>
              ))}
              
              {/* Time slots */}
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  <div className="text-center p-2 text-sm text-gray-600">
                    {time}
                  </div>
                  {weekDays.map((day) => {
                    const scheduledActivities = getScheduledActivities(day, time);
                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className="min-h-[60px] border border-gray-200 p-1"
                        onDrop={(e) => {
                          e.preventDefault();
                          // Handle drop logic here
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {scheduledActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className={`text-xs p-1 rounded mb-1 cursor-pointer ${
                              activity.completed ? 'opacity-50 line-through' : ''
                            } ${categoryColors[activity.category]}`}
                            onClick={() => toggleComplete(activity.id)}
                          >
                            {activity.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityScheduler;
