import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { Task } from './TaskCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
  project_id: string;
}

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  teamMembers: Array<{ id: string; name: string }>;
  onTaskEdit: (task: Task) => void;
  onCreateTask: () => void;
  onTasksChange: () => void;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanBoard({ 
  projectId, 
  tasks, 
  teamMembers, 
  onTaskEdit, 
  onCreateTask, 
  onTasksChange,
  onTaskClick 
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchColumns();
  }, [projectId]);

  const fetchColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) throw error;
      setColumns(data || []);
    } catch (err: any) {
      console.error('Error fetching columns:', err);
      toast({
        title: "Error",
        description: "Failed to load kanban columns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskMove = async (taskId: string, columnId: string) => {
    try {
      // Find the target column
      const targetColumn = columns.find(col => col.id === columnId);
      if (!targetColumn) return;

      // Map column ID to status
      const statusMap: { [key: string]: Task['status'] } = {
        'To Do': 'todo',
        'In Progress': 'in-progress',
        'Review': 'review',
        'Done': 'done'
      };

      const newStatus = statusMap[targetColumn.name] || 'todo';

      // Update the task in the database
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          kanban_column: targetColumn.name.toLowerCase().replace(' ', '-'),
          kanban_position: 0
        })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks
      onTasksChange();
      
      toast({
        title: "Success",
        description: "Task moved successfully",
      });
    } catch (err: any) {
      console.error('Error moving task:', err);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive"
      });
    }
  };

  // Filter tasks based on search and filters, excluding sub-tasks
  const filteredTasks = tasks.filter(task => {
    // Exclude sub-tasks from the Kanban view
    if (task.is_subtask || task.parent_task_id) {
      return false;
    }
    
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignee = filterAssignee === 'all' || 
      (filterAssignee === 'unassigned' ? !task.assignee_id : task.assignee_id === filterAssignee);
    
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  // Group tasks by column
  const getTasksForColumn = (columnName: string) => {
    const statusMap: { [key: string]: Task['status'] } = {
      'To Do': 'todo',
      'In Progress': 'in-progress',
      'Review': 'review',
      'Done': 'done'
    };
    
    const status = statusMap[columnName];
    return filteredTasks
      .filter(task => task.status === status)
      .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading kanban board...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={onCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex space-x-6 pb-6 min-h-[600px]">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksForColumn(column.name)}
              teamMembers={teamMembers}
              onTaskEdit={onTaskEdit}
              onTaskMove={handleTaskMove}
              onCreateTask={onCreateTask}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}