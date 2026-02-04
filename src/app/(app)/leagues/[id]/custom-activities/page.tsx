'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useLeague } from '@/contexts/league-context';
import { useCustomActivities, CustomActivity } from '@/hooks/use-custom-activities';
import { useActivityCategories } from '@/hooks/use-activity-categories';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Camera, FileText, Clock, Footprints, MapPin, Circle, Target, Tag, ChevronDown } from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Measurement Type Config
// ============================================================================

const MEASUREMENT_TYPES = [
    { value: 'none', label: 'None (No measurement required)', icon: Circle, description: 'Activity completion only - no RR calculation' },
    { value: 'duration', label: 'Duration (minutes)', icon: Clock, description: 'Time-based activities like workouts, yoga, etc.' },
    { value: 'distance', label: 'Distance (km/miles)', icon: MapPin, description: 'Distance-based activities like running, cycling, etc.' },
    { value: 'steps', label: 'Steps', icon: Footprints, description: 'Step count activities' },
    { value: 'hole', label: 'Holes', icon: Target, description: 'Golf or similar activities' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface FormData {
    activity_name: string;
    description: string;
    category_id: string;
    measurement_type: 'duration' | 'distance' | 'hole' | 'steps' | 'none';
    requires_proof: boolean;
    requires_notes: boolean;
}

const defaultFormData: FormData = {
    activity_name: '',
    description: '',
    category_id: '',
    measurement_type: 'none',
    requires_proof: true,
    requires_notes: false,
};

// ============================================================================
// Main Page Component
// ============================================================================

export default function CustomActivitiesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: leagueId } = use(params);
    const { league } = useLeague();
    const { activities, isLoading, error, createActivity, updateActivity, deleteActivity, refetch } = useCustomActivities();
    const { categories, isLoading: categoriesLoading } = useActivityCategories();

    // UI State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Filter activities that are used in the current league
    const activitiesWithLeagueStatus = useMemo(() => {
        return activities.map(activity => ({
            ...activity,
            // Check if activity is used in current league - this would need additional API data
            // For now, we'll just show the activity
        }));
    }, [activities]);

    // Handlers
    const handleCreate = async () => {
        if (!formData.activity_name.trim()) return;

        setIsSaving(true);
        const result = await createActivity({
            activity_name: formData.activity_name.trim(),
            description: formData.description.trim() || undefined,
            category_id: formData.category_id || undefined,
            measurement_type: formData.measurement_type,
            requires_proof: formData.requires_proof,
            requires_notes: formData.requires_notes,
        });

        if (result) {
            setFormData(defaultFormData);
            setShowCreateForm(false);
        }
        setIsSaving(false);
    };

    const handleUpdate = async () => {
        if (!editingId || !formData.activity_name.trim()) return;

        setIsSaving(true);
        const success = await updateActivity({
            custom_activity_id: editingId,
            activity_name: formData.activity_name.trim(),
            description: formData.description.trim() || undefined,
            category_id: formData.category_id || null,
            measurement_type: formData.measurement_type,
            requires_proof: formData.requires_proof,
            requires_notes: formData.requires_notes,
        });

        if (success) {
            setEditingId(null);
            setFormData(defaultFormData);
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        const success = await deleteActivity(id);
        if (success) {
            setDeleteConfirmId(null);
        }
    };

    const startEdit = (activity: CustomActivity) => {
        setEditingId(activity.custom_activity_id);
        setFormData({
            activity_name: activity.activity_name,
            description: activity.description || '',
            category_id: activity.category_id || '',
            measurement_type: activity.measurement_type,
            requires_proof: activity.requires_proof,
            requires_notes: activity.requires_notes,
        });
        setShowCreateForm(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData(defaultFormData);
    };

    const cancelCreate = () => {
        setShowCreateForm(false);
        setFormData(defaultFormData);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/leagues/${leagueId}/activities`}
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Configure Activities
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Custom Activities</h1>
                            <p className="text-muted-foreground mt-1">
                                Create custom activities that can be used across your leagues
                            </p>
                        </div>

                        {!showCreateForm && !editingId && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Create New
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}

                {/* Create Form */}
                {showCreateForm && (
                    <div className="mb-8 p-6 bg-card rounded-xl border shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Create Custom Activity</h2>
                        <ActivityForm
                            formData={formData}
                            setFormData={setFormData}
                            onSave={handleCreate}
                            onCancel={cancelCreate}
                            isSaving={isSaving}
                            submitLabel="Create Activity"
                            categories={categories}
                        />
                    </div>
                )}

                {/* Activities List */}
                <div className="space-y-4">
                    {activities.length === 0 && !showCreateForm ? (
                        <div className="text-center py-12 bg-card rounded-xl border">
                            <div className="text-muted-foreground mb-4">
                                <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No custom activities yet</p>
                                <p className="text-sm mt-1">Create your first custom activity to get started</p>
                            </div>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Create Custom Activity
                            </button>
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <div key={activity.custom_activity_id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
                                {editingId === activity.custom_activity_id ? (
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Edit Activity</h3>
                                        <ActivityForm
                                            formData={formData}
                                            setFormData={setFormData}
                                            onSave={handleUpdate}
                                            onCancel={cancelEdit}
                                            isSaving={isSaving}
                                            submitLabel="Save Changes"
                                            categories={categories}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-foreground">{activity.activity_name}</h3>
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                                        Custom
                                                    </span>
                                                    {activity.category && (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full flex items-center gap-1">
                                                            <Tag className="h-3 w-3" />
                                                            {activity.category.display_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {activity.description && (
                                                    <p className="text-sm text-muted-foreground mb-3">{activity.description}</p>
                                                )}

                                                <div className="flex flex-wrap gap-3 text-sm">
                                                    {/* Measurement Type */}
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        {(() => {
                                                            const mt = MEASUREMENT_TYPES.find(m => m.value === activity.measurement_type);
                                                            const IconComponent = mt?.icon || Circle;
                                                            return (
                                                                <>
                                                                    <IconComponent className="h-4 w-4" />
                                                                    <span>{mt?.label.split(' ')[0] || 'None'}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Proof Required */}
                                                    <div className={`flex items-center gap-1.5 ${activity.requires_proof ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                                        <Camera className="h-4 w-4" />
                                                        <span>Proof: {activity.requires_proof ? 'Required' : 'Optional'}</span>
                                                    </div>

                                                    {/* Notes Required */}
                                                    <div className={`flex items-center gap-1.5 ${activity.requires_notes ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                                        <FileText className="h-4 w-4" />
                                                        <span>Notes: {activity.requires_notes ? 'Required' : 'Optional'}</span>
                                                    </div>

                                                    {/* Usage Count */}
                                                    {activity.usage_count !== undefined && activity.usage_count > 0 && (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <span>Used in {activity.usage_count} league{activity.usage_count !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 ml-4">
                                                {deleteConfirmId === activity.custom_activity_id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleDelete(activity.custom_activity_id)}
                                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                            title="Confirm delete"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(null)}
                                                            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEdit(activity)}
                                                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(activity.custom_activity_id)}
                                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Activity Form Component
// ============================================================================

interface ActivityFormProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    submitLabel: string;
    categories: Array<{ category_id: string; category_name: string; display_name: string; }>;
}

function ActivityForm({ formData, setFormData, onSave, onCancel, isSaving, submitLabel, categories }: ActivityFormProps) {
    return (
        <div className="space-y-4">
            {/* Activity Name */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                    Activity Name <span className="text-destructive">*</span>
                </label>
                <input
                    type="text"
                    value={formData.activity_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, activity_name: e.target.value }))}
                    placeholder="e.g., Morning Walk, Meditation, etc."
                    className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={100}
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the activity"
                    rows={2}
                    className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    maxLength={500}
                />
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                    Category <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                    <select
                        value={formData.category_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none pr-10"
                    >
                        <option value="">Select a category...</option>
                        {categories.map((cat) => (
                            <option key={cat.category_id} value={cat.category_id}>
                                {cat.display_name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Choose the category this activity belongs to</p>
            </div>

            {/* Measurement Type */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Measurement Type <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MEASUREMENT_TYPES.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = formData.measurement_type === type.value;
                        return (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, measurement_type: type.value as any }))}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${isSelected
                                    ? 'border-primary bg-primary/5 text-foreground'
                                    : 'border-border hover:border-muted-foreground/50'
                                    }`}
                            >
                                <IconComponent className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div>
                                    <div className="font-medium text-sm">{type.label.split(' ')[0]}</div>
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Requirements */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Requirements
                </label>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.requires_proof}
                            onChange={(e) => setFormData(prev => ({ ...prev, requires_proof: e.target.checked }))}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                        />
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Require proof upload</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.requires_notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, requires_notes: e.target.checked }))}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                        />
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Require notes</span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving || !formData.activity_name.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSaving ? 'Saving...' : submitLabel}
                </button>
            </div>
        </div>
    );
}
