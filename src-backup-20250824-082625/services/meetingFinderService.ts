export interface Meeting {
  id: string;
  name: string;
  type: string;
  day: string;
  time: string;
  location: string;
  virtual?: boolean;
  link?: string;
}

class MeetingFinderService {
  async searchMeetings(options: {
    latitude?: number;
    longitude?: number;
    radius?: number;
  } = {}): Promise<Meeting[]> {
    // In a real app this would call an API with the given coordinates
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '1',
        name: 'Downtown AA Meeting',
        type: 'AA',
        day: 'Mon',
        time: '7:00 PM',
        location: '123 Main St, Springfield',
      },
      {
        id: '2',
        name: 'Lunchtime Recovery',
        type: 'NA',
        day: 'Wed',
        time: '12:00 PM',
        location: '456 Oak Ave, Springfield',
      },
      {
        id: '3',
        name: 'Online Support Meeting',
        type: 'SMART',
        day: 'Fri',
        time: '6:00 PM',
        location: 'Virtual',
        virtual: true,
        link: 'https://example.com/meeting',
      },
    ];
  }

  getDirectionsUrl(meeting: Meeting): string {
    const query = encodeURIComponent(meeting.location);
    return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  }
}

const meetingFinderService = new MeetingFinderService();
export default meetingFinderService;
