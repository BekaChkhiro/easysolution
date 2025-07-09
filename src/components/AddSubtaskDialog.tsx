import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/TaskCard';

interface AddSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTask: Task;
  teamMembers: Array<{ id: string; name: string }>;
  onSubtaskCreated: () => void;
}

export function AddSubtaskDialog({ 
  open, 
  onOpenChange, 
  parentTask, 
  teamMembers, 
  onSubtaskCreated 
}: AddSubtaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subtask title",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get the next order position
      const { data: lastSubtask } = await supabase
        .from('tasks')
        .select('subtask_order')
        .eq('parent_task_id', parentTask.id)
        .order('subtask_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (lastSubtask?.subtask_order || 0) + 1;

      const { data: subtaskResult, error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
          due_date: dueDate || null,
          project_id: parentTask.project_id,
          parent_task_id: parentTask.id,
          is_subtask: true,
          subtask_order: nextOrder,
          created_by: user?.id,
          status: 'todo'
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: parentTask.project_id,
        p_user_id: user?.id,
        p_activity_type: 'subtask_created',
        p_description: `Created subtask "${title.trim()}" under "${parentTask.title}"`,
        p_entity_type: 'task',
        p_entity_id: subtaskResult.id
      });

      toast({
        title: "Success",
        description: "Subtask created successfully",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssigneeId('unassigned');
      setDueDate('');
      
      onSubtaskCreated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating subtask:', err);
      toast({
        title: "Error",
        description: "Failed to create subtask",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subtask</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Creating subtask for: <span className="font-medium">{parentTask.title}</span>
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter subtask title"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter subtask description"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high' | 'critical')} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Subtask"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}