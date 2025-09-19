import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, Clock, ArrowRight } from 'lucide-react';

interface LocationState {
  email?: string;
  organizationName?: string;
}

const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { email?: string; organizationName?: string; applicationId?: string } | null;
  
  const email = state?.email || 'your email';
  const organizationName = state?.organizationName || 'your organization';
  
  // Use application ID from state or generate fallback
  const applicationId = state?.applicationId || `APP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  return (
    <div 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{
        background: 'var(--gradient-success)',
        color: 'var(--foreground)'
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div 
          className="p-8 text-center"
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)'
          }}
        >
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div 
              className="p-6 rounded-full"
              style={{
                backgroundColor: 'var(--success-light)',
                borderRadius: 'var(--radius)'
              }}
            >
              <CheckCircle 
                className="h-16 w-16" 
                style={{ color: 'var(--success)' }}
              />
            </div>
          </div>
          
          {/* Main Message */}
          <h1 
            className="text-4xl font-bold mb-4"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-heading)'
            }}
          >
            Registration Submitted Successfully!
          </h1>
          
          <p 
            className="text-xl mb-8"
            style={{
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-body)'
            }}
          >
            Thank you for your interest in becoming an organizer with us.
          </p>
          
          {/* Registration Details */}
          <div 
            className="rounded-xl p-6 mb-8"
            style={{
              backgroundColor: 'var(--muted)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <h2 
              className="text-2xl font-semibold mb-4"
              style={{
                color: 'var(--foreground)',
                fontFamily: 'var(--font-heading)'
              }}
            >
              What happens next?
            </h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start text-left">
                <div 
                  className="p-2 rounded-full mr-4 mt-1"
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    borderRadius: 'var(--radius)'
                  }}
                >
                  <Mail 
                    className="h-5 w-5" 
                    style={{ color: 'var(--primary)' }}
                  />
                </div>
                <div>
                  <h3 
                    className="font-semibold mb-1"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Confirmation Email Sent
                  </h3>
                  <p 
                    style={{
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    We've sent a confirmation email to <strong>{email}</strong>. 
                    Please check your inbox and spam folder.
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-start text-left">
                <div 
                  className="p-2 rounded-full mr-4 mt-1"
                  style={{
                    backgroundColor: 'var(--warning-light)',
                    borderRadius: 'var(--radius)'
                  }}
                >
                  <Clock 
                    className="h-5 w-5" 
                    style={{ color: 'var(--warning)' }}
                  />
                </div>
                <div>
                  <h3 
                    className="font-semibold mb-1"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Application Review
                  </h3>
                  <p 
                    style={{
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Our team will review your application for <strong>{organizationName}</strong>. 
                    This process typically takes 2-3 business days.
                  </p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-start text-left">
                <div 
                  className="p-2 rounded-full mr-4 mt-1"
                  style={{
                    backgroundColor: 'var(--success-light)',
                    borderRadius: 'var(--radius)'
                  }}
                >
                  <CheckCircle 
                    className="h-5 w-5" 
                    style={{ color: 'var(--success)' }}
                  />
                </div>
                <div>
                  <h3 
                    className="font-semibold mb-1"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Account Activation
                  </h3>
                  <p 
                    style={{
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    Once approved, you'll receive login credentials and access to the 
                    organizer dashboard to start creating games.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Application ID */}
          <div 
            className="rounded-lg p-4 mb-8"
            style={{
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-light)',
              borderRadius: 'var(--radius)'
            }}
          >
            <p 
              className="text-sm"
              style={{
                color: 'var(--primary-dark)',
                fontFamily: 'var(--font-body)'
              }}
            >
              <strong>Application ID:</strong> <span 
                className="font-mono text-lg font-semibold" 
                style={{ color: 'var(--primary)' }}
              >{applicationId}</span>
            </p>
            <p 
              className="text-xs mt-1"
              style={{
                color: 'var(--primary)',
                fontFamily: 'var(--font-body)'
              }}
            >
              Please save this ID for your records. You can use it to check your application status.
            </p>
          </div>
          
          {/* Contact Information */}
          <div 
            className="pt-8"
            style={{
              borderTop: '1px solid var(--border)'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{
                color: 'var(--foreground)',
                fontFamily: 'var(--font-heading)'
              }}
            >
              Need Help?
            </h3>
            <p 
              className="mb-4"
              style={{
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-body)'
              }}
            >
              If you have any questions about your application or need assistance, 
              we're here to help.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`mailto:support@joli.com?subject=Application ${applicationId}&body=Hello, I have a question about my organizer application (ID: ${applicationId}).`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-body)'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.backgroundColor = 'var(--background)';
                }}
                onFocus={(e: React.FocusEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.outline = '2px solid var(--primary)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e: React.FocusEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <Mail className="h-5 w-5 mr-2" />
                Email Support
              </a>
              
              <button
                onClick={() => navigate('/status', { state: { applicationId } })}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-body)'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-dark)';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary)';
                }}
                onFocus={(e: React.FocusEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.outline = '2px solid var(--primary)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e: React.FocusEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Check Status
                <ArrowRight className="h-5 w-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="mt-8 text-center">
          <p 
            className="text-sm"
            style={{
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-body)'
            }}
          >
            This confirmation page will remain accessible for 30 days. 
            We recommend bookmarking this page or saving your application ID.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;