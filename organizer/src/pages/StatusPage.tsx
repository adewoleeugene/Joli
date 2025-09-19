import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { registrationService, type OrganizerApplication, type ApplicationStatus } from '../services/registrationService';



const StatusPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState(applicationId || '');
  const [applicationData, setApplicationData] = useState<OrganizerApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const handleSearch = async () => {
    if (!searchId.trim()) {
      setError('Please enter an application ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await registrationService.getApplicationStatus(searchId);
      setApplicationData(data);
      toast.success('Application found!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Application not found. Please check your application ID and try again.';
      setError(errorMessage);
      setApplicationData(null);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId && applicationId.startsWith('ORG-')) {
      handleSearch();
    }
  }, [applicationId]);

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-8 w-8" style={{ color: 'var(--warning)' }} />;
      case 'under_review':
        return <AlertCircle className="h-8 w-8" style={{ color: 'var(--primary)' }} />;
      case 'approved':
        return <CheckCircle className="h-8 w-8" style={{ color: 'var(--success)' }} />;
      case 'rejected':
        return <XCircle className="h-8 w-8" style={{ color: 'var(--destructive)' }} />;
      case 'requires_info':
        return <AlertCircle className="h-8 w-8" style={{ color: 'var(--warning)' }} />;
      default:
        return <Clock className="h-8 w-8" style={{ color: 'var(--muted-foreground)' }} />;
    }
  };

  const getStatusText = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'Application Received';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Not Approved';
      case 'requires_info':
        return 'Additional Information Required';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    const baseStyle = {
      fontFamily: 'var(--font-body)'
    };
    
    switch (status) {
      case 'pending':
        return { ...baseStyle, backgroundColor: 'var(--warning-background)', borderColor: 'var(--warning-border)', color: 'var(--warning-foreground)' };
      case 'under_review':
        return { ...baseStyle, backgroundColor: 'var(--primary-background)', borderColor: 'var(--primary-border)', color: 'var(--primary-foreground)' };
      case 'approved':
        return { ...baseStyle, backgroundColor: 'var(--success-background)', borderColor: 'var(--success-border)', color: 'var(--success-foreground)' };
      case 'rejected':
        return { ...baseStyle, backgroundColor: 'var(--destructive-background)', borderColor: 'var(--destructive-border)', color: 'var(--destructive-foreground)' };
      case 'requires_info':
        return { ...baseStyle, backgroundColor: 'var(--warning-background)', borderColor: 'var(--warning-border)', color: 'var(--warning-foreground)' };
      default:
        return { ...baseStyle, backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--muted-foreground)' };
    }
  };

  return (
    <div 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(to bottom right, var(--muted), var(--accent))',
        fontFamily: 'var(--font-body)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center mb-6"
            style={{
              color: 'var(--primary)',
              fontFamily: 'var(--font-body)'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = 'var(--primary-foreground)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = 'var(--primary)';
            }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Registration
          </button>
          
          <h1 
            className="text-4xl font-bold mb-4"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-heading)'
            }}
          >
            Application Status
          </h1>
          <p 
            className="text-xl"
            style={{
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-body)'
            }}
          >
            Check the status of your organizer registration application
          </p>
        </div>

        {/* Search Section */}
        <div 
          className="p-8 mb-8"
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border)'
          }}
        >
          <div className="max-w-md mx-auto">
            <label 
              className="block text-sm font-medium mb-2"
              style={{
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)'
              }}
            >
              Application ID
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter your application ID (e.g., ORG-12345678)"
                  className="w-full pl-10 pr-4 py-3 border focus:ring-2 focus:border-transparent"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-body)'
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = '2px solid var(--ring)';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-body)'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                  }
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }
                }}
                onFocus={(e: React.FocusEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.outline = '2px solid var(--ring)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e: React.FocusEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--primary-foreground)' }}></div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
            
            {error && (
              <p 
                className="mt-3 text-sm text-center"
                style={{
                  color: 'var(--destructive)',
                  fontFamily: 'var(--font-body)'
                }}
              >{error}</p>
            )}
          </div>
        </div>

        {/* Application Details */}
        {applicationData && (
          <div 
            className="p-8"
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--border)'
            }}
          >
            {/* Status Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                {getStatusIcon(applicationData.status)}
              </div>
              <h2 
                className="text-3xl font-bold mb-2"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                {getStatusText(applicationData.status)}
              </h2>
              <div 
                className="inline-block px-4 py-2 border"
                style={{
                  ...getStatusColor(applicationData.status),
                  borderRadius: 'var(--radius)'
                }}
              >
                Application ID: {applicationData.id}
              </div>
            </div>

            {/* Application Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 
                  className="text-lg font-semibold mb-4"
                  style={{
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-heading)'
                  }}
                >Application Details</h3>
                <div className="space-y-3">
                  <div>
                    <span 
                      className="text-sm font-medium"
                      style={{
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >Organization:</span>
                    <p 
                      style={{
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >{applicationData.organizationInfo.name}</p>
                  </div>
                  <div>
                    <span 
                      className="text-sm font-medium"
                      style={{
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >Submitted:</span>
                    <p 
                      style={{
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >{new Date(applicationData.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span 
                      className="text-sm font-medium"
                      style={{
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >Last Updated:</span>
                    <p 
                      style={{
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >{new Date(applicationData.lastUpdated).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 
                  className="text-lg font-semibold mb-4"
                  style={{
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-heading)'
                  }}
                >Status Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div 
                      className="p-1 rounded-full mr-3"
                      style={{
                        backgroundColor: 'var(--success-background)'
                      }}
                    >
                      <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                    </div>
                    <span 
                      className="text-sm"
                      style={{
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >Application Submitted</span>
                  </div>
                  <div className="flex items-center">
                    <div 
                      className="p-1 rounded-full mr-3"
                      style={{
                        backgroundColor: ['under_review', 'approved', 'rejected', 'requires_info'].includes(applicationData.status)
                          ? 'var(--primary-background)'
                          : 'var(--muted)'
                      }}
                    >
                      <AlertCircle 
                        className="h-4 w-4"
                        style={{
                          color: ['under_review', 'approved', 'rejected', 'requires_info'].includes(applicationData.status)
                            ? 'var(--primary)'
                            : 'var(--muted-foreground)'
                        }}
                      />
                    </div>
                    <span 
                      className="text-sm"
                      style={{
                        color: ['under_review', 'approved', 'rejected', 'requires_info'].includes(applicationData.status)
                          ? 'var(--foreground)'
                          : 'var(--muted-foreground)',
                        fontWeight: ['under_review', 'approved', 'rejected', 'requires_info'].includes(applicationData.status)
                          ? '500'
                          : 'normal',
                        fontFamily: 'var(--font-body)'
                      }}
                    >
                      Review in Progress
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div 
                      className="p-1 rounded-full mr-3"
                      style={{
                        backgroundColor: ['approved', 'rejected'].includes(applicationData.status)
                          ? applicationData.status === 'approved' ? 'var(--success-background)' : 'var(--destructive-background)'
                          : 'var(--muted)'
                      }}
                    >
                      {applicationData.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                      ) : applicationData.status === 'rejected' ? (
                        <XCircle className="h-4 w-4" style={{ color: 'var(--destructive)' }} />
                      ) : (
                        <Clock className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                      )}
                    </div>
                    <span 
                      className="text-sm"
                      style={{
                        color: ['approved', 'rejected'].includes(applicationData.status)
                          ? 'var(--foreground)'
                          : 'var(--muted-foreground)',
                        fontWeight: ['approved', 'rejected'].includes(applicationData.status)
                          ? '500'
                          : 'normal',
                        fontFamily: 'var(--font-body)'
                      }}
                    >
                      Final Decision
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Notes */}
            {applicationData.reviewNotes && (
              <div className="mb-8">
                <h3 
                  className="text-lg font-semibold mb-3"
                  style={{
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-heading)'
                  }}
                >Review Notes</h3>
                <div 
                  className="p-4"
                  style={{
                    backgroundColor: 'var(--muted)',
                    borderRadius: 'var(--radius)'
                  }}
                >
                  <p 
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >{applicationData.reviewNotes}</p>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="mb-8">
              <h3 
                className="text-lg font-semibold mb-3"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >Next Steps</h3>
              <div 
                className="border p-4"
                style={{
                  backgroundColor: 'var(--primary-background)',
                  borderColor: 'var(--primary-border)',
                  borderRadius: 'var(--radius)'
                }}
              >
                <p 
                  style={{
                    color: 'var(--primary-foreground)',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  {applicationData.status === 'pending' && 'Your application is in queue for review. We will contact you soon.'}
                  {applicationData.status === 'under_review' && 'Our team is currently reviewing your application. We may contact you for additional information.'}
                  {applicationData.status === 'approved' && 'Congratulations! Your application has been approved. Check your email for next steps.'}
                  {applicationData.status === 'rejected' && 'Unfortunately, your application was not approved. Please see review notes for details.'}
                  {applicationData.status === 'requires_info' && 'We need additional information from you. Please check your email and respond promptly.'}
                </p>
              </div>
            </div>

            {/* Contact Support */}
            <div 
              className="pt-8"
              style={{
                borderTop: '1px solid var(--border)'
              }}
            >
              <h3 
                className="text-lg font-semibold mb-4 text-center"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                Need Help?
              </h3>
              <p 
                className="text-center mb-6"
                style={{
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                If you have questions about your application status, our support team is here to help.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:support@joli-platform.com"
                  className="inline-flex items-center justify-center px-6 py-3 border transition-colors"
                  style={{
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-body)'
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-background)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Email Support
                </a>
                
                <a
                  href="tel:+1-555-0123"
                  className="inline-flex items-center justify-center px-6 py-3 transition-colors"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-body)'
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Support
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPage;