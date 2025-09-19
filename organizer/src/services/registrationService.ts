import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

// Registration form schema
export const registrationSchema = z.object({
  // Organization Information
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationType: z.enum(['school', 'university', 'company', 'nonprofit', 'government', 'other']),
  organizationSize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  description: z.string().min(50, 'Please provide at least 50 characters describing your organization'),

  
  // Contact Person Information
  contactFirstName: z.string().min(2, 'Contact person first name must be at least 2 characters'),
  contactLastName: z.string().min(2, 'Contact person last name must be at least 2 characters'),
  contactEmail: z.string().email('Please enter a valid email address'),
  contactPhone: z.string().min(10, 'Please enter a valid phone number'),
  
  // Address Information
  address: z.string().min(5, 'Please enter a complete address'),
  
  // Terms and Conditions
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy'),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info';

export interface OrganizerApplication {
  id: string;
  status: ApplicationStatus;
  submittedAt: Date;
  lastUpdated: Date;
  organizationInfo: {
    name: string;
    type: string;
    size: string;
    website?: string;
    description: string;
  
  };
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
  };
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

class RegistrationService {
  /**
   * Submit a new organizer application
   */
  async submitApplication(formData: RegistrationFormData): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/organizer/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationInfo: {
            name: formData.organizationName,
            type: formData.organizationType,
            size: formData.organizationSize,
            website: formData.website,
            description: formData.description,

          },
          contactInfo: {
            firstName: formData.contactFirstName,
            lastName: formData.contactLastName,
            email: formData.contactEmail,
            phone: formData.contactPhone,
            address: formData.address,
          },
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit application');
      }

      const data = await response.json();
      return data.applicationId;
    } catch (error: any) {
      console.error('Error submitting application:', error);
      throw new Error(error.message || 'Failed to submit application. Please try again.');
    }
  }

  /**
   * Get application status by application ID
   */
  async getApplicationStatus(applicationId: string): Promise<OrganizerApplication | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/organizer/applications/${applicationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch application status');
      }

      const data = await response.json();
      return {
        ...data.application,
        submittedAt: new Date(data.application.submittedAt),
        lastUpdated: new Date(data.application.lastUpdated),
        reviewedAt: data.application.reviewedAt ? new Date(data.application.reviewedAt) : undefined
      };
    } catch (error: any) {
      console.error('Error fetching application status:', error);
      throw new Error(error.message || 'Failed to fetch application status');
    }
  }

  // Removed: updateApplicationStatus was a privileged-only method and is no longer supported

  /**
   * Send confirmation email (handled by backend)
   */
  private async sendConfirmationEmail(
    email: string,
    applicationId: string,
    organizationName: string
  ): Promise<void> {
    // This is now handled by the backend when the application is submitted
    console.log(`Confirmation email would be sent to ${email} for application ${applicationId}`);
  }

  /**
   * Send status update email (handled by backend)
   */
  private async sendStatusUpdateEmail(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    // This is now handled by the backend when the status is updated
    console.log(`Status update email would be sent for application ${applicationId} with status ${status}`);
  }

  /**
   * Validate registration data
   */
  validateRegistrationData(data: unknown): RegistrationFormData {
    return registrationSchema.parse(data);
  }
}

export const registrationService = new RegistrationService();
export default registrationService;