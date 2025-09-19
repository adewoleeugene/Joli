import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, Phone, User, MapPin, Globe, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { registrationService, registrationSchema, type RegistrationFormData } from '../services/registrationService';

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    
    try {
      const applicationId = await registrationService.submitApplication(data);
      
      toast.success('Registration submitted successfully!');
      navigate('/confirmation', { 
        state: { 
          email: data.contactEmail,
          organizationName: data.organizationName,
          applicationId
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit registration. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{
        background: 'var(--gradient-primary)',
        color: 'var(--foreground)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div 
              className="p-4 rounded-full"
              style={{
                backgroundColor: 'var(--primary)',
                borderRadius: 'var(--radius)'
              }}
            >
              <Building2 
                className="h-12 w-12" 
                style={{ color: 'var(--primary-foreground)' }}
              />
            </div>
          </div>
          <h1 
            className="text-4xl font-bold mb-4"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-heading)'
            }}
          >
            Register as Organizer
          </h1>
          <p 
            className="text-xl max-w-2xl mx-auto"
            style={{
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-body)'
            }}
          >
            Join our platform to create and manage engaging games and activities for your organization.
          </p>
        </div>

        {/* Registration Form */}
        <div 
          className="p-8"
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)'
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">


            {/* Organization Information Section */}
            <div>
              <h2 
                className="text-2xl font-semibold mb-6 flex items-center"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                <Building2 
                  className="h-6 w-6 mr-3" 
                  style={{ color: 'var(--primary)' }}
                />
                Organization Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    {...register('organizationName')}
                    className="w-full px-4 py-3"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--input)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.outline = 'none';
                      (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                    placeholder="Enter your organization name"
                  />
                  {errors.organizationName && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.organizationName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Organization Type *
                  </label>
                  <select
                    {...register('organizationType')}
                    className="w-full px-4 py-3"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--input)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.outline = 'none';
                      (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select organization type</option>
                    <option value="school">School</option>
                    <option value="university">University</option>
                    <option value="company">Company</option>
                    <option value="nonprofit">Non-profit</option>
                    <option value="government">Government</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.organizationType && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.organizationType.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Organization Size *
                  </label>
                  <select
                    {...register('organizationSize')}
                    className="w-full px-4 py-3"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--input)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.outline = 'none';
                      (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select organization size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-1000">201-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                  {errors.organizationSize && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.organizationSize.message}
                    </p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Website (Optional)
                  </label>
                  <div className="relative">
                    <Globe 
                      className="absolute left-3 top-3.5 h-5 w-5" 
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                    <input
                      type="url"
                      {...register('website')}
                      className="w-full pl-10 pr-4 py-3"
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--input)',
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.outline = 'none';
                        (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                        (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = 'var(--border)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                      placeholder="https://www.yourorganization.com"
                    />
                  </div>
                  {errors.website && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.website.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Person Section */}
            <div>
              <h2 
                className="text-2xl font-semibold mb-6 flex items-center"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                <User 
                  className="h-6 w-6 mr-3" 
                  style={{ color: 'var(--primary)' }}
                />
                Contact Person
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    {...register('contactFirstName')}
                    className="w-full px-4 py-3"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--input)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.outline = 'none';
                      (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                    placeholder="Enter first name"
                  />
                  {errors.contactFirstName && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.contactFirstName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    {...register('contactLastName')}
                    className="w-full px-4 py-3"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--input)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.outline = 'none';
                      (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                    placeholder="Enter last name"
                  />
                  {errors.contactLastName && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.contactLastName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail 
                      className="absolute left-3 top-3.5 h-5 w-5" 
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                    <input
                      type="email"
                      {...register('contactEmail')}
                      className="w-full pl-10 pr-4 py-3"
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--input)',
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.outline = 'none';
                        (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                        (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = 'var(--border)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                      placeholder="Enter email address"
                    />
                  </div>
                  {errors.contactEmail && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.contactEmail.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone 
                      className="absolute left-3 top-3.5 h-5 w-5" 
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                    <input
                      type="tel"
                      {...register('contactPhone')}
                      className="w-full pl-10 pr-4 py-3"
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--input)',
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.outline = 'none';
                        (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                        (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = 'var(--border)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                      placeholder="Enter phone number"
                    />
                  </div>
                  {errors.contactPhone && (
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {errors.contactPhone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div>
              <h2 
                className="text-2xl font-semibold mb-6 flex items-center"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                <MapPin 
                  className="h-6 w-6 mr-3" 
                  style={{ color: 'var(--primary)' }}
                />
                Address Information
              </h2>
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  Organization Address *
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full px-4 py-3"
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-body)'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.outline = 'none';
                    (e.target as HTMLElement).style.borderColor = 'var(--ring)';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'var(--border)';
                    (e.target as HTMLElement).style.boxShadow = 'none';
                  }}
                  placeholder="Enter your complete organization address"
                />
                {errors.address && (
                  <p 
                    className="mt-1 text-sm"
                    style={{ color: 'var(--destructive)' }}
                  >
                    {errors.address.message}
                  </p>
                )}
              </div>
            </div>



            {/* Terms and Conditions */}
            <div>
              <h2 
                className="text-2xl font-semibold mb-6 flex items-center"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                <CheckCircle 
                  className="h-6 w-6 mr-3" 
                  style={{ color: 'var(--primary)' }}
                />
                Terms and Conditions
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    {...register('agreeToTerms')}
                    className="mt-1 h-4 w-4"
                    style={{
                      accentColor: 'var(--primary)',
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--primary)'
                    }}
                  />
                  <label 
                    className="ml-3 text-sm"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    I agree to the{' '}
                    <a 
                      href="#" 
                      className="underline"
                      style={{
                        color: 'var(--primary)',
                        textDecoration: 'underline'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.color = 'var(--primary-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.color = 'var(--primary)';
                      }}
                    >
                      Terms and Conditions
                    </a>{' '}
                    *
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--destructive)' }}
                  >
                    {errors.agreeToTerms.message}
                  </p>
                )}
                
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    {...register('agreeToPrivacy')}
                    className="mt-1 h-4 w-4"
                    style={{
                       accentColor: 'var(--primary)',
                       borderColor: 'var(--border)',
                       backgroundColor: 'var(--primary)'
                     }}
                  />
                  <label 
                    className="ml-3 text-sm"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    I agree to the{' '}
                    <a 
                      href="#" 
                      className="underline"
                      style={{
                        color: 'var(--primary)',
                        textDecoration: 'underline'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.color = 'var(--primary-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.color = 'var(--primary)';
                      }}
                    >
                      Privacy Policy
                    </a>{' '}
                    *
                  </label>
                </div>
                {errors.agreeToPrivacy && (
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--destructive)' }}
                  >
                    {errors.agreeToPrivacy.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 font-semibold text-lg transition-colors"
                style={{
                  backgroundColor: isSubmitting ? 'var(--muted)' : 'var(--primary)',
                  color: isSubmitting ? 'var(--muted-foreground)' : 'var(--primary-foreground)',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    (e.target as HTMLElement).style.backgroundColor = 'var(--primary-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    (e.target as HTMLElement).style.backgroundColor = 'var(--primary)';
                  }
                }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.outline = 'none';
                  (e.target as HTMLElement).style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div 
                      className="animate-spin rounded-full h-6 w-6 mr-3"
                      style={{
                        border: '2px solid transparent',
                        borderBottom: '2px solid var(--primary-foreground)'
                      }}
                    ></div>
                    Submitting Registration...
                  </div>
                ) : (
                  'Submit Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;