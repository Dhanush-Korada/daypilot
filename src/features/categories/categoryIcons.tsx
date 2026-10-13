import React from 'react';
import {
  Dumbbell,
  BookOpen,
  GraduationCap,
  Briefcase,
  Heart,
  Users,
  Cake,
  Flame,
  Tag,
  Folder,
  ShoppingBag,
  Music,
  DollarSign,
  Home,
  Coffee,
  Sparkles,
  Plane,
  Car,
  Smile,
  Shield,
  Zap,
} from 'lucide-react';

export const AVAILABLE_CATEGORY_ICONS = [
  'Dumbbell',
  'BookOpen',
  'GraduationCap',
  'Briefcase',
  'Heart',
  'Users',
  'Cake',
  'Flame',
  'Tag',
  'ShoppingBag',
  'Music',
  'DollarSign',
  'Home',
  'Coffee',
  'Sparkles',
  'Plane',
  'Car',
  'Smile',
  'Shield',
  'Zap',
  'Folder',
];

export const AVAILABLE_CATEGORY_COLORS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#64748b', // slate
];

export function getCategoryIcon(iconName: string, className = 'w-4 h-4'): React.ReactNode {
  switch (iconName) {
    case 'Dumbbell':
      return <Dumbbell className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Cake':
      return <Cake className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Music':
      return <Music className={className} />;
    case 'DollarSign':
      return <DollarSign className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'Smile':
      return <Smile className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Tag':
      return <Tag className={className} />;
    case 'Folder':
    default:
      return <Folder className={className} />;
  }
}
