import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Edit, Trash2, Check, X, User, AlertCircle, Timer, Target, CheckCircle2 } from 'lucide-react';
import { Task } from '../TaskCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubtasksTabProps {
  parentTask: Task;
  subtasks: Task[];
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  onSubtasksUpdate: () => void;
}

const priorityConfig = {
  'low': { 
    color: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800',
    indicator: 'bg-slate-400',
    icon: Timer
  },
  'medium': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    indicator: 'bg-blue-500',
    icon: Target
  },
  'high': { 
    color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
    indicator: 'bg-orange-500',
    icon: AlertCircle
  },
  'critical': { 
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
    indicator: 'bg-red-500',
    icon: AlertCircle
  },
};

// Sortable Subtask Item Component
interface SortableSubtaskItemProps {
  subtask: Task;
  assignee: { id: string; name: string; email?: string } | undefined;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  isEditing: boolean;
  editTitle: string;
  editAssignee: string;
  editPriority: 'low' | 'medium' | 'high' | 'critical';
  onEditStart: (subtask: Task) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditTitleChange: (title: string) => void;
  onEditAssigneeChange: (assignee: string) => void;
  onEditPriorityChange: (priority: 'low' | 'medium' | 'high' | 'critical') => void;
  onStatusToggle: () => void;
  onDelete: () => void;
  getInitials: (name: string) => string;
}

function SortableSubtaskItem({
  subtask,
  assignee,
  teamMembers,
  isEditing,
  editTitle,
  editAssignee,
  editPriority,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditTitleChange,
  onEditAssigneeChange,
  onEditPriorityChange,
  onStatusToggle,
  onDelete,
  getInitials,
}: SortableSubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityInfo = priorityConfig[subtask.priority as keyof typeof priorityConfig];
  const PriorityIcon = priorityInfo.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-105' : ''}`}
    >
      <Card className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Checkbox */}
            <Checkbox
              checked={subtask.status === 'done'}
              onCheckedChange={onStatusToggle}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onEditSave();
                      if (e.key === 'Escape') onEditCancel();
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={editAssignee} onValueChange={onEditAssigneeChange}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Select value={editPriority} onValueChange={onEditPriorityChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={onEditSave}
                      className="h-7 text-xs flex-1"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onEditCancel}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 
                      className={`font-medium leading-tight ${
                        subtask.status === 'done' 
                          ? 'line-through text-muted-foreground' 
                          : 'text-card-foreground'
                      }`}
                    >
                      {subtask.title}
                    </h4>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditStart(subtask)}
                        className="h-8 w-8 p-0 hover:bg-muted/50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${priorityInfo.color} border text-xs font-medium px-2 py-1 inline-flex items-center gap-1`}
                        variant="outline"
                      >
                        <PriorityIcon className="h-3 w-3" />
                        {subtask.priority}
                      </Badge>
                      {subtask.status === 'done' && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    {assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-2 ring-primary/10">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground font-medium">
                          {assignee.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubtasksTab({ parentTask, subtasks, teamMembers, onSubtasksUpdate }: SubtasksTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('unassigned');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('unassigned');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [sortedSubtasks, setSortedSubtasks] = useState<Task[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep local sorted list in sync with props
  React.useEffect(() => {
    // Deep compare subtasks to prevent unnecessary re-renders
    const currentSubtaskIds = sortedSubtasks.map(task => task.id).join(',');
    const newSubtaskIds = subtasks.map(task => task.id).join(',');
    
    // Only resort if the subtasks have actually changed
    if (currentSubtaskIds !== newSubtaskIds || subtasks.some((task, i) => 
      sortedSubtasks[i] && (task.status !== sortedSubtasks[i].status || task.title !== sortedSubtasks[i].title))) {
      console.log('Subtasks updated, resorting list');
      const sorted = [...subtasks].sort((a, b) => (a.subtask_order || 0) - (b.subtask_order || 0));
      setSortedSubtasks(sorted);
    }
  }, [subtasks]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = sortedSubtasks.findIndex(item => item.id === active.id);
    const overIndex = sortedSubtasks.findIndex(item => item.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newOrder = arrayMove(sortedSubtasks, activeIndex, overIndex);
      setSortedSubtasks(newOrder);

      // Update database with new order
      try {
        const updates = newOrder.map((subtask, index) => ({
          id: subtask.id,
          subtask_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ subtask_order: update.subtask_order })
            .eq('id', update.id);
        }

        onSubtasksUpdate();
      } catch (error: any) {
        console.error('Error updating subtask order:', error);
        toast({
          title: "Error",
          description: "Failed to update subtask order",
          variant: "destructive"
        });
        // Revert to original order on error
        setSortedSubtasks([...subtasks].sort((a, b) => (a.subtask_order || 0) - (b.subtask_order || 0)));
      }
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !user) return;

    setIsAdding(true);
    try {
      // First, shift all existing subtasks down by incrementing their order
      if (sortedSubtasks.length > 0) {
        // Create updates for all existing subtasks
        const updates = sortedSubtasks.map(subtask => ({
          id: subtask.id,
          subtask_order: (subtask.subtask_order || 0) + 1
        }));

        // Update all existing subtasks order
        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ subtask_order: update.subtask_order })
            .eq('id', update.id);
        }
      }

      // Now insert the new subtask at order 0 (top position)
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newSubtaskTitle.trim(),
          project_id: parentTask.project_id,
          parent_task_id: parentTask.id,
          is_subtask: true,
          status: 'todo',
          priority: newSubtaskPriority,
          assignee_id: newSubtaskAssignee === 'unassigned' ? null : newSubtaskAssignee,
          created_by: user.id,
          subtask_order: 0 // Put at the top of the list
        });

      if (error) throw error;

      setNewSubtaskTitle('');
      setNewSubtaskAssignee('unassigned');
      setNewSubtaskPriority('medium');
      onSubtasksUpdate();

      toast({
        title: "Success",
        description: "Subtask added successfully"
      });
    } catch (error: any) {
      console.error('Error adding subtask:', error);
      toast({
        title: "Error",
        description: "Failed to add subtask",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleStatusToggle = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', subtaskId);

      if (error) throw error;
      onSubtasksUpdate();

      toast({
        title: "Success",
        description: `Subtask ${newStatus === 'done' ? 'completed' : 'reopened'}`
      });
    } catch (error: any) {
      console.error('Error updating subtask status:', error);
      toast({
        title: "Error",
        description: "Failed to update subtask status",
        variant: "destructive"
      });
    }
  };

  const handleEditStart = (subtask: Task) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setEditAssignee(subtask.assignee_id || 'unassigned');
    setEditPriority(subtask.priority as 'low' | 'medium' | 'high' | 'critical');
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editingId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          title: editTitle.trim(),
          assignee_id: editAssignee === 'unassigned' ? null : editAssignee,
          priority: editPriority
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditTitle('');
      setEditAssignee('unassigned');
      setEditPriority('medium');
      onSubtasksUpdate();

      toast({
        title: "Success",
        description: "Subtask updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating subtask:', error);
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive"
      });
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
    setEditAssignee('unassigned');
    setEditPriority('medium');
  };

  const handleDelete = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      onSubtasksUpdate();

      toast({
        title: "Success",
        description: "Subtask deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting subtask:', error);
      toast({
        title: "Error",
        description: "Failed to delete subtask",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-full">
      {/* Add New Subtask Card */}
      <Card className="m-6 mb-4 border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">Add New Subtask</h3>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="What needs to be done?"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                className="text-sm border-2 focus:border-primary"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Unassigned
                        </div>
                      </SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select value={newSubtaskPriority} onValueChange={(value: any) => setNewSubtaskPriority(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim() || isAdding}
                className="w-full h-10 font-medium"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subtask
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtasks List */}
      <div className="mx-6 mb-6 space-y-3">
        {sortedSubtasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No subtasks yet</p>
                  <p className="text-sm text-muted-foreground">Break down this task into smaller, manageable pieces</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedSubtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sortedSubtasks.map((subtask) => {
                  const assignee = teamMembers.find(m => m.id === subtask.assignee_id);
                  
                  return (
                    <SortableSubtaskItem
                      key={subtask.id}
                      subtask={subtask}
                      assignee={assignee}
                      teamMembers={teamMembers}
                      isEditing={editingId === subtask.id}
                      editTitle={editTitle}
                      editAssignee={editAssignee}
                      editPriority={editPriority}
                      onEditStart={handleEditStart}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onEditTitleChange={setEditTitle}
                      onEditAssigneeChange={setEditAssignee}
                      onEditPriorityChange={setEditPriority}
                      onStatusToggle={() => handleStatusToggle(subtask.id, subtask.status)}
                      onDelete={() => handleDelete(subtask.id)}
                      getInitials={getInitials}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}