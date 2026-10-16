export const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];
export type Availability = 'available' | 'temporarily_unavailable' | 'not_donating';
export interface PublicDonor { uid: string; displayName: string; bloodGroup: BloodGroup; province: string; city: string; availability: Availability; verified: boolean; }
export const PK_CITIES: Record<string,string[]> = {
 Punjab:['Lahore','Faisalabad','Rawalpindi','Multan','Gujranwala','Sialkot'], Sindh:['Karachi','Hyderabad','Sukkur'],
 'Khyber Pakhtunkhwa':['Peshawar','Abbottabad','Mardan'], Balochistan:['Quetta','Gwadar'], 'Islamabad Capital Territory':['Islamabad'],
 'Gilgit-Baltistan':['Gilgit'], 'Azad Kashmir':['Muzaffarabad']};

export const PREFERRED_CONTACT = ['in_app','phone','whatsapp'] as const;
export type PreferredContact = typeof PREFERRED_CONTACT[number];
export const PREFERRED_CONTACT_LABEL: Record<PreferredContact,string> = { in_app:'In-app messages', phone:'Phone call', whatsapp:'WhatsApp' };
/** Owner-only document at privateProfiles/{uid}. Never copied into publicDonorProfiles. */
export interface PrivateProfile { fullName: string; email: string; phone: string; preferredContact: PreferredContact; }
