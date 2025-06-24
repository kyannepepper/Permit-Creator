import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Download, Printer } from "lucide-react";
import { Link } from "wouter";

export default function CreatePermitDocument() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);

  // Form state for permit details
  const [permitData, setPermitData] = useState({
    permitNumber: `PERMIT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    numberOfPeople: '',
    insuranceCarrier: '',
    divisionDesignee: '',
    issueDate: new Date().toISOString().split('T')[0],
    permitteeSignature: '',
    permitteeName: '',
    permitteeDate: new Date().toISOString().split('T')[0]
  });

  // Fetch application data
  const { data: application, isLoading } = useQuery({
    queryKey: [`/api/applications/${id}`],
    enabled: !!id,
  });

  const { data: parks = [] } = useQuery({
    queryKey: ["/api/parks"],
  });

  const { data: permitTemplates = [] } = useQuery({
    queryKey: ["/api/permit-templates"],
  });

  const park = parks.find((p: any) => p.id === application?.parkId);
  
  // Find the permit template for this application's permit type
  const permitTemplate = permitTemplates.find((template: any) => 
    template.parkId === application?.parkId
  );

  // Auto-fill form data when application loads
  useEffect(() => {
    if (application) {
      setPermitData(prev => ({
        ...prev,
        numberOfPeople: application.attendees?.toString() || '',
        permitteeName: `${application.firstName} ${application.lastName}`,
      }));
    }
  }, [application]);

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window with the permit content for PDF generation
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Special Use Permit - ${application?.applicationNumber}</title>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
              body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .permit-title { font-size: 16px; font-weight: bold; margin: 10px 0; }
              .park-info { font-size: 12px; margin-bottom: 20px; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .section { margin: 15px 0; }
              .section-title { font-weight: bold; margin-bottom: 8px; }
              .terms { font-size: 10px; }
              .signature-area { margin-top: 30px; }
              .signature-line { border-bottom: 1px solid #000; display: inline-block; width: 200px; margin: 0 20px; }
              hr { border: none; border-top: 1px solid #000; margin: 15px 0; }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <Layout title="Create Permit Document">
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Loading application data...</p>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout title="Create Permit Document">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Application not found</p>
          <Link href="/permit-documents">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Permit Documents
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Permit Document">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center no-print">
          <div className="flex items-center gap-4">
            <Link href="/permit-documents">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create Permit Document</h1>
              <p className="text-muted-foreground">
                Application #{application.applicationNumber} - {application.eventTitle}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Form Section */}
        <Card className="no-print">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Permit Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="permitNumber">Permit Number</Label>
                <Input
                  id="permitNumber"
                  value={permitData.permitNumber}
                  onChange={(e) => setPermitData(prev => ({ ...prev, permitNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="numberOfPeople">Number of People</Label>
                <Input
                  id="numberOfPeople"
                  value={permitData.numberOfPeople}
                  onChange={(e) => setPermitData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                  placeholder="From application"
                />
              </div>
              <div>
                <Label htmlFor="insuranceCarrier">Insurance Carrier</Label>
                <Input
                  id="insuranceCarrier"
                  value={permitData.insuranceCarrier}
                  onChange={(e) => setPermitData(prev => ({ ...prev, insuranceCarrier: e.target.value }))}
                  placeholder="Enter insurance carrier"
                />
              </div>
              <div>
                <Label htmlFor="divisionDesignee">Division Designee</Label>
                <Input
                  id="divisionDesignee"
                  value={permitData.divisionDesignee}
                  onChange={(e) => setPermitData(prev => ({ ...prev, divisionDesignee: e.target.value }))}
                  placeholder="Enter designee name"
                />
              </div>
              <div>
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={permitData.issueDate}
                  onChange={(e) => setPermitData(prev => ({ ...prev, issueDate: e.target.value }))}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="permitteeName">Permittee Name (for signature)</Label>
                <Input
                  id="permitteeName"
                  value={permitData.permitteeName}
                  onChange={(e) => setPermitData(prev => ({ ...prev, permitteeName: e.target.value }))}
                  placeholder={`${application?.firstName} ${application?.lastName}`}
                />
              </div>
              <div>
                <Label htmlFor="permitteeSignature">Permittee Signature</Label>
                <Input
                  id="permitteeSignature"
                  value={permitData.permitteeSignature}
                  onChange={(e) => setPermitData(prev => ({ ...prev, permitteeSignature: e.target.value }))}
                  placeholder="Type signature here"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permit Document Preview */}
        <div ref={printRef} className="bg-white p-8 shadow-lg" style={{ fontSize: '11px', lineHeight: '1.3', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>ATTACHMENT B</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '10px 0' }}>Utah Division of State Parks</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '10px 0' }}>SPECIAL USE PERMIT</div>
            <div style={{ fontSize: '12px' }}>{park?.name}; {park?.location}</div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '15px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <strong>Application #</strong> {application.applicationNumber}<br/>
              <strong>Permit #</strong> {permitData.permitNumber}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ width: '60%' }}>
              <strong>Permittee</strong><br/>
              {application.firstName} {application.lastName}<br/>
              <strong>Address:</strong><br/>
              {application.address || 'Address not provided'}<br/>
              <strong>Contact:</strong> {application.email}
            </div>
            <div style={{ width: '35%' }}>
              <strong>State Park</strong><br/>
              {park?.name}
            </div>
          </div>

          <div style={{ marginBottom: '15px', textAlign: 'justify' }}>
            This Permit, made and entered into this {formatDate(new Date())}, by and between the Department
            of Natural Resources, Utah Division of State Parks, 1594 West North Temple, Suite 116, Salt Lake City,
            UT 84114-6001, hereafter referred as "DIVISION" and {application.firstName} {application.lastName} whose address is 
            {application.address || 'Address not provided'} hereafter referred to as "PERMITTEE".
          </div>

          <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '15px' }}>WITNESSETH:</div>

          <div style={{ marginBottom: '15px', textAlign: 'justify' }}>
            By this permit, DIVISION authorizes PERMITTEE to use the following described land(s) and/or
            improvement(s), subject to the conditions set out below:
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>This Permit is issued by DIVISION solely for the following activities:</strong>
            <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
              <li><strong>Event:</strong> {application.eventTitle}</li>
              <li><strong>Days:</strong> {formatDate(application.eventDate)}</li>
              <li><strong>Number of people:</strong> {permitData.numberOfPeople || 'Not specified'}</li>
              {permitData.insuranceCarrier && <li><strong>Insurance Carrier:</strong> {permitData.insuranceCarrier}</li>}
            </ul>
          </div>

          <div style={{ marginBottom: '15px' }}>
            The term of this permit is limited to a maximum of 1 day, and is hereby issued for <strong>{formatDate(application.eventDate)}</strong> inclusively.
          </div>

          <div style={{ marginBottom: '15px' }}>
            In return for the privilege of using said land(s) and/or improvements, PERMITTEE hereby agrees to
            accept and comply with each of the following terms and conditions:
          </div>

          {permitTemplate?.termsAndConditions && (
            <div style={{ fontSize: '10px', marginBottom: '15px', textAlign: 'justify' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{permitTemplate.termsAndConditions}</div>
            </div>
          )}

          {!permitTemplate?.termsAndConditions && (
            <div style={{ fontSize: '10px', marginBottom: '15px' }}>
              <ol>
                <li style={{ marginBottom: '8px' }}>
                  DIVISION may terminate this Permit at any time for breach of any terms or conditions stated herein.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  PERMITTEE shall comply with DIVISION regulations governing use of state park system including
                  federal, state, county and municipal laws, ordinances and regulations that are applicable to the
                  activity and the area of operation authorized herein.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  This permit is accepted by PERMITTEE, subject to the use of premises and additional conditions.
                </li>
              </ol>
            </div>
          )}

          <div style={{ marginTop: '30px' }}>
            <strong>IN WITNESS WHEREOF, the parties subscribed their names as of the date written.</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div style={{ width: '45%' }}>
              <strong>PERMITTEE</strong><br/><br/>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', height: '20px', textAlign: 'center', paddingTop: '5px', fontStyle: 'italic' }}>
                {permitData.permitteeSignature || '(Digital Signature)'}
              </div>
              {permitData.permitteeName || `${application.firstName} ${application.lastName}`} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formatDate(permitData.permitteeDate)}<br/><br/>
            </div>
            <div style={{ width: '45%' }}>
              <strong>STATE - Utah Division of State Parks</strong><br/><br/>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', height: '20px' }}></div>
              {permitData.divisionDesignee || 'Division Designee'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formatDate(permitData.issueDate)}<br/><br/>
            </div>
          </div>

          <div style={{ marginTop: '30px', fontSize: '10px', textAlign: 'center' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </Layout>
  );
}