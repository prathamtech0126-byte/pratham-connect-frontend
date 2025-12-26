import { useState, useMemo } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Search, FileSpreadsheet, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UniversityData {
  srNo?: string | number;
  universityName: string;
  locationProvince: string;
  campus: string;
  cipCodes: string;
  intake: string;
  coursesAvailable: string;
  tuitionFees: string;
  courseType: string;
  duration: string;
  moi: string;
  ielts: string;
  toefl: string;
  pte: string;
  duolingo: string;
  qualificationRequired: string;
  backlogsAccepted: string;
  gapAccepted: string;
  percentageAccepted: string;
  pgwpEligible: string;
  sowpEligible: string;
  category: string;
  subCategory: string;
}

export default function UniversityDatabase() {
  const { toast } = useToast();
  const [data, setData] = useState<UniversityData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    location: "all",
    courseType: "all",
    intake: "all"
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        // Map excel columns to our interface
        const mappedData: UniversityData[] = jsonData.map((row) => ({
          srNo: row["Sr.no"] || row["Sr No"] || "",
          universityName: row["University Name"] || "",
          locationProvince: row["Location/Province"] || row["Province"] || "",
          campus: row["Campus"] || "",
          cipCodes: row["CIP Codes"] || "",
          intake: row["Intake"] || "",
          coursesAvailable: row["Courses Available"] || "",
          tuitionFees: row["Tution Fees"] || row["Tuition Fees"] || "",
          courseType: row["Course Type"] || "",
          duration: row["Duration"] || "",
          moi: row["MOI"] || "",
          ielts: row["IELTS- (L/R/W/S/OVERALL)"] || row["IELTS"] || "",
          toefl: row["TOEFL- (L/R/W/S/OVERALL)"] || row["TOEFL"] || "",
          pte: row["PTE- (L/R/W/S/OVERALL)"] || row["PTE"] || "",
          duolingo: row["Duolingo"] || "",
          qualificationRequired: row["Qualification Required"] || "",
          backlogsAccepted: row["Backlogs Accepted"] || "",
          gapAccepted: row["GAP Accepted"] || "",
          percentageAccepted: row["Percentage Accepted"] || "",
          pgwpEligible: row["PGWP Eligible"] || "",
          sowpEligible: row["SOWP Eligible"] || "",
          category: row["Category"] || "",
          subCategory: row["Sub-Category"] || "",
        }));

        setData(mappedData);
        toast({
          title: "Success",
          description: `Imported ${mappedData.length} records successfully.`,
        });
      } catch (error) {
        console.error("Error parsing excel:", error);
        toast({
          title: "Error",
          description: "Failed to parse excel file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = item.universityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.coursesAvailable.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = filters.location === "all" || item.locationProvince === filters.location;
      const matchesCourseType = filters.courseType === "all" || item.courseType === filters.courseType;
      const matchesIntake = filters.intake === "all" || item.intake.includes(filters.intake);

      return matchesSearch && matchesLocation && matchesCourseType && matchesIntake;
    });
  }, [data, searchTerm, filters]);

  const uniqueLocations = useMemo(() => Array.from(new Set(data.map(i => i.locationProvince).filter(Boolean))), [data]);
  const uniqueCourseTypes = useMemo(() => Array.from(new Set(data.map(i => i.courseType).filter(Boolean))), [data]);

  const downloadExcel = () => {
    if (filteredData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "University Data");
    XLSX.writeFile(wb, "University_Database_Filtered.xlsx");
  };

  return (
    <PageWrapper title="University Database" breadcrumbs={[{ label: "University DB" }]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Import & Manage Data</CardTitle>
                <CardDescription>Upload excel files to populate the university database (Admin only)</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => document.getElementById('excel-upload')?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Excel
                </Button>
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" onClick={downloadExcel} disabled={filteredData.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Filtered
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="University or Course..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Province/Location</Label>
                <Select value={filters.location} onValueChange={(v) => setFilters(f => ({ ...f, location: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Course Type</Label>
                <Select value={filters.courseType} onValueChange={(v) => setFilters(f => ({ ...f, courseType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueCourseTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Intake</Label>
                <Select value={filters.intake} onValueChange={(v) => setFilters(f => ({ ...f, intake: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Intakes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Intakes</SelectItem>
                    <SelectItem value="Jan">January</SelectItem>
                    <SelectItem value="May">May</SelectItem>
                    <SelectItem value="Sep">September</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px]">Sr.no</TableHead>
                    <TableHead className="min-w-[200px]">University Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead className="min-w-[200px]">Courses</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>IELTS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <FileSpreadsheet className="h-12 w-12 mb-2 opacity-20" />
                          <p>No data available. Please upload an excel file.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.srNo}</TableCell>
                        <TableCell className="font-medium">{item.universityName}</TableCell>
                        <TableCell>{item.locationProvince}</TableCell>
                        <TableCell>{item.intake}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.coursesAvailable}</TableCell>
                        <TableCell>{item.tuitionFees}</TableCell>
                        <TableCell>{item.courseType}</TableCell>
                        <TableCell>{item.ielts}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}
