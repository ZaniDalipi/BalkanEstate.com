import React from 'react';
import {
  AlertCircle, Building2, Calendar, CheckCircle, Clock, Home, MessageSquare, Star, Ticket, TrendingDown, TrendingUp, UserMinus, UserPlus, XCircle,
} from 'lucide-react';

const ICONS: Record<string, React.ReactElement> = {
  new_listing: <Home className="w-4 h-4 text-green-500" />,
  price_drop: <TrendingDown className="w-4 h-4 text-blue-500" />,
  new_message: <MessageSquare className="w-4 h-4 text-purple-500" />,
  new_inquiry: <MessageSquare className="w-4 h-4 text-purple-500" />,
  listing_milestone: <TrendingUp className="w-4 h-4 text-orange-500" />,
  listing_trending: <TrendingUp className="w-4 h-4 text-orange-500" />,
  promotion_suggestion: <Star className="w-4 h-4 text-yellow-500" />,
  promotion_success: <Star className="w-4 h-4 text-yellow-500" />,
  agency_join_request: <UserPlus className="w-4 h-4 text-blue-600" />,
  agent_joined_agency: <UserPlus className="w-4 h-4 text-green-600" />,
  agency_join_welcome: <UserPlus className="w-4 h-4 text-green-600" />,
  agent_left_agency: <UserMinus className="w-4 h-4 text-red-500" />,
  agency_coupon_redeemed: <Ticket className="w-4 h-4 text-indigo-500" />,
  new_viewing: <Calendar className="w-4 h-4 text-amber-500" />,
  viewing_approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  viewing_declined: <XCircle className="w-4 h-4 text-red-500" />,
  listing_limit_increased: <CheckCircle className="w-4 h-4 text-blue-500" />,
  // Residences
  development_unit_available: <Home className="w-4 h-4 text-emerald-600" />,
  development_price_drop: <TrendingDown className="w-4 h-4 text-blue-500" />,
  development_update: <Building2 className="w-4 h-4 text-teal-600" />,
  residence_trial_reminder: <Clock className="w-4 h-4 text-amber-500" />,
  residence_agency_grace: <Clock className="w-4 h-4 text-amber-500" />,
  residence_offline: <Building2 className="w-4 h-4 text-red-500" />,
};

/** The small icon next to a notification, by type. */
export const NotificationIcon: React.FC<{ type: string }> = ({ type }) => ICONS[type] ?? <AlertCircle className="w-4 h-4 text-gray-500" />;
