import { useState, useRef } from "react";
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
    receiptNumber: `${Math.floor(Math.random() * 900000) + 100000}`,
    permitFee: '',
    additionalFee: '',
    performanceBond: '0',
    activities: '',
    numberOfPeople: '',
    numberOfVehicles: '',
    equipment: '',
    arrivalTime: '',
    departureTime: '',
    locations: '',
    specialConditions: '',
    insuranceCarrier: '',
    insurancePhone: '',
    insuranceAmount: '$1,000,000.00'
  });

  // Fetch application data
  const { data: application, isLoading } = useQuery({
    queryKey: [`/api/applications/${id}`],
    enabled: !!id,
  });

  const { data: parks = [] } = useQuery({
    queryKey: ["/api/parks"],
  });

  const park = parks.find((p: any) => p.id === application?.parkId);

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
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  value={permitData.receiptNumber}
                  onChange={(e) => setPermitData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="permitFee">Permit Fee</Label>
                <Input
                  id="permitFee"
                  value={permitData.permitFee}
                  onChange={(e) => setPermitData(prev => ({ ...prev, permitFee: e.target.value }))}
                  placeholder="$150.00"
                />
              </div>
              <div>
                <Label htmlFor="additionalFee">Additional Fee</Label>
                <Input
                  id="additionalFee"
                  value={permitData.additionalFee}
                  onChange={(e) => setPermitData(prev => ({ ...prev, additionalFee: e.target.value }))}
                  placeholder="$545.00"
                />
              </div>
              <div>
                <Label htmlFor="numberOfPeople">Number of People</Label>
                <Input
                  id="numberOfPeople"
                  value={permitData.numberOfPeople}
                  onChange={(e) => setPermitData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="numberOfVehicles">Number of Vehicles</Label>
                <Input
                  id="numberOfVehicles"
                  value={permitData.numberOfVehicles}
                  onChange={(e) => setPermitData(prev => ({ ...prev, numberOfVehicles: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="arrivalTime">Arrival Time</Label>
                <Input
                  id="arrivalTime"
                  value={permitData.arrivalTime}
                  onChange={(e) => setPermitData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  placeholder="7:00 AM"
                />
              </div>
              <div>
                <Label htmlFor="departureTime">Departure Time</Label>
                <Input
                  id="departureTime"
                  value={permitData.departureTime}
                  onChange={(e) => setPermitData(prev => ({ ...prev, departureTime: e.target.value }))}
                  placeholder="7:30 PM"
                />
              </div>
              <div>
                <Label htmlFor="insuranceCarrier">Insurance Carrier</Label>
                <Input
                  id="insuranceCarrier"
                  value={permitData.insuranceCarrier}
                  onChange={(e) => setPermitData(prev => ({ ...prev, insuranceCarrier: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="activities">Activities Description</Label>
                <Textarea
                  id="activities"
                  value={permitData.activities}
                  onChange={(e) => setPermitData(prev => ({ ...prev, activities: e.target.value }))}
                  placeholder="Describe the activities in detail..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="locations">Specific Locations</Label>
                <Textarea
                  id="locations"
                  value={permitData.locations}
                  onChange={(e) => setPermitData(prev => ({ ...prev, locations: e.target.value }))}
                  placeholder="List specific areas, campsites, etc..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="equipment">Equipment</Label>
                <Textarea
                  id="equipment"
                  value={permitData.equipment}
                  onChange={(e) => setPermitData(prev => ({ ...prev, equipment: e.target.value }))}
                  placeholder="List all equipment to be used..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="specialConditions">Special Conditions</Label>
                <Textarea
                  id="specialConditions"
                  value={permitData.specialConditions}
                  onChange={(e) => setPermitData(prev => ({ ...prev, specialConditions: e.target.value }))}
                  placeholder="Any special terms or conditions..."
                  rows={3}
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
            <div>
              <strong>Receipt #</strong> {permitData.receiptNumber}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ width: '60%' }}>
              <strong>Permittee</strong><br/>
              {application.firstName} {application.lastName}<br/>
              <strong>Contact Person</strong><br/>
              {application.firstName} {application.lastName} ({application.email})
            </div>
            <div style={{ width: '35%' }}>
              <strong>Area Code & Telephone #</strong><br/>
              <div style={{ borderBottom: '1px solid #000', minHeight: '20px', marginBottom: '10px' }}></div>
              <strong>State Park</strong><br/>
              {park?.name}
            </div>
          </div>

          <div style={{ marginBottom: '15px', textAlign: 'justify' }}>
            This Permit, made and entered into this {formatDate(new Date())}, by and between the Department
            of Natural Resources, Utah Division of State Parks, 1594 West North Temple, Suite 116, Salt Lake City,
            UT 84114-6001, hereafter referred as "DIVISION" and {application.firstName} {application.lastName} whose address is 
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '200px', margin: '0 5px' }}></span> 
            hereafter referred to as "PERMITTEE".
          </div>

          <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '15px' }}>WITNESSETH:</div>

          <div style={{ marginBottom: '15px', textAlign: 'justify' }}>
            By this permit, DIVISION authorizes PERMITTEE to use the following described land(s) and/or
            improvement(s), subject to the conditions set out below:
          </div>

          <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
            <li>{permitData.locations || '[Specific locations to be filled]'}</li>
          </ul>

          <div style={{ marginBottom: '15px' }}>
            <strong>This Permit is issued by DIVISION solely for the following activities (Describe in Detail):</strong>
            <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
              <li>{permitData.activities || application.eventTitle}</li>
              <li><strong>Times:</strong> {permitData.arrivalTime} - {permitData.departureTime}</li>
              <li><strong>Number of people:</strong> {permitData.numberOfPeople}</li>
              <li><strong>Number of vehicles:</strong> {permitData.numberOfVehicles}</li>
              <li><strong>Equipment:</strong> {permitData.equipment}</li>
            </ul>
          </div>

          <div style={{ marginBottom: '15px' }}>
            The term of this permit is limited to a maximum of 1 day, and is hereby issued for <strong>{formatDate(application.eventDate)}</strong> inclusively.
          </div>

          <div style={{ marginBottom: '15px' }}>
            In return for the privilege of using said land(s) and/or improvements, PERMITTEE hereby agrees to
            accept and comply with each of the following terms and conditions:
          </div>

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
                No alterations, modifications, improvements, changes or damages, of any nature, shall be made
                by PERMITTEE on or to any DIVISION land(s), or improvement(s) without specific written approval
                by the DIVISION in advance.
              </li>
              <li style={{ marginBottom: '8px' }}>
                PERMITTEE will pay the DIVISION a {permitData.permitFee || '$150.00'} non-refundable permit fee and {permitData.additionalFee || '$545.00'} additionally
                for use of said land(s) and and/or improvement(s) and any other services agreed to herein.
              </li>
              <li style={{ marginBottom: '8px' }}>
                This permit is accepted by PERMITTEE, subject to the use of premises and additional conditions.
              </li>
            </ol>
          </div>

          {permitData.specialConditions && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Special Conditions:</strong>
              <div style={{ marginTop: '5px', paddingLeft: '10px' }}>
                {permitData.specialConditions}
              </div>
            </div>
          )}

          <div style={{ marginTop: '30px' }}>
            <strong>IN WITNESS WHEREOF, the parties subscribed their names as of the date written.</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div style={{ width: '45%' }}>
              <strong>PERMITTEE</strong><br/><br/>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', height: '20px' }}></div>
              Name &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date<br/><br/>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', height: '20px' }}></div>
              Type or Print Name and Title
            </div>
            <div style={{ width: '45%' }}>
              <strong>STATE - Utah Division of State Parks</strong><br/><br/>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', height: '20px' }}></div>
              Division Designee &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date<br/><br/>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', height: '20px' }}></div>
              Code
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