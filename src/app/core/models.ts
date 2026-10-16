export const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];
export type Availability = 'available' | 'temporarily_unavailable' | 'not_donating';
export interface PublicDonor { uid: string; displayName: string; bloodGroup: BloodGroup; province: string; city: string; availability: Availability; verified: boolean; }
export { PK_CITIES, CITY_PROVINCE, POPULAR_CITIES } from './pk-cities';

export const PREFERRED_CONTACT = ['in_app','phone','whatsapp'] as const;
export type PreferredContact = typeof PREFERRED_CONTACT[number];
export const PREFERRED_CONTACT_LABEL: Record<PreferredContact,string> = { in_app:'In-app messages', phone:'Phone call', whatsapp:'WhatsApp' };
/** Owner-only document at privateProfiles/{uid}. Never copied into publicDonorProfiles. */
export interface PrivateProfile { fullName: string; email: string; phone: string; preferredContact: PreferredContact; }

export const URGENCY = ['today','this_week','planned'] as const;
export type Urgency = typeof URGENCY[number];
export const URGENCY_LABEL: Record<Urgency,string> = { today:'Needed today', this_week:'This week', planned:'Planned' };
export type ContactStatus = 'pending' | 'accepted' | 'declined';
/** contactRequests/{fromUid_toUid}. Written only by Cloud Functions; sharedContact appears only after the donor accepts. */
export interface ContactRequest {
  id: string; fromUid: string; toUid: string; status: ContactStatus;
  fromName: string; toName: string; bloodGroup: BloodGroup; urgency: Urgency; hospital: string; city: string; message: string;
  createdAt?: { toDate(): Date }; respondedAt?: { toDate(): Date };
  sharedContact?: { name: string; phone: string; preferredContact: PreferredContact };
}
