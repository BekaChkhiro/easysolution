import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Task } from './TaskCard';
import 'react-calendar/dist/Calendar.css';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type: string;
  created_by: string;
  project_id: string;
}

interface ProjectCalendarProps {
  projectId: string;
  tasks: Task[];
}

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Date is required'),
  event_type: z.enum(['milestone', 'meeting', 'deadline', 'other']),
});

type EventFormData = z.infer<typeof eventFormSchema>;

export function ProjectCalendar({ projectId, tasks }: ProjectCalendarProps) {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_date: '',
      event_type: 'milestone',
    },
  });

  useEffect(() => {
    fetchEvents();
  }, [projectId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('project_id', projectId)
        .order('event_date');

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive"
      });
    }
  };

  const handleCreateEvent = async (data: EventFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: data.title,
          description: data.description || null,
          event_date: data.event_date,
          event_type: data.event_type,
          project_id: projectId,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      setEventDialogOpen(false);
      form.reset();
      fetchEvents();
    } catch (err: any) {
      console.error('Error creating event:', err);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.event_date), date)
    );
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date);
      const dayEvents = getEventsForDate(date);
      const totalItems = dayTasks.length + dayEvents.length;
      
      if (totalItems > 0) {
        return (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date);
      const dayEvents = getEventsForDate(date);
      const hasItems = dayTasks.length > 0 || dayEvents.length > 0;
      const isToday = isSameDay(date, new Date());
      
      return `${hasItems ? 'has-events' : ''} ${isToday ? 'today' : ''}`;
    }
    return '';
  };

  const handleDateClick = (value: Date) => {
    setSelectedDate(value);
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Project Calendar</h2>
        </div>
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateEvent)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Event title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Event description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="event_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="event_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEventDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <style>{`
                .react-calendar {
                  width: 100%;
                  background: transparent;
                  border: none;
                  font-family: inherit;
                }
                .react-calendar__tile {
                  position: relative;
                  height: 60px;
                  border: 1px solid hsl(var(--border));
                  background: hsl(var(--background));
                  color: hsl(var(--foreground));
                }
                .react-calendar__tile:enabled:hover,
                .react-calendar__tile:enabled:focus {
                  background: hsl(var(--accent));
                }
                .react-calendar__tile--active {
                  background: hsl(var(--primary));
                  color: hsl(var(--primary-foreground));
                }
                .react-calendar__tile.today {
                  background: hsl(var(--secondary));
                }
                .react-calendar__navigation button {
                  color: hsl(var(--foreground));
                  background: transparent;
                  border: none;
                  font-size: 1rem;
                  padding: 0.5rem;
                }
                .react-calendar__navigation button:enabled:hover,
                .react-calendar__navigation button:enabled:focus {
                  background: hsl(var(--accent));
                }
              `}</style>
              <Calendar
                onChange={(value) => setDate(value as Date)}
                value={date}
                onClickDay={handleDateClick}
                tileContent={tileContent}
                tileClassName={tileClassName}
                selectRange={false}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {format(selectedDate, 'MMMM dd, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.event_type}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {selectedDateTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Task due
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {selectedDateEvents.length === 0 && selectedDateTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No events or tasks on this date
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{event.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(event.event_date), 'MMM dd')}
                    </Badge>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}