import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Table components not needed - using raw HTML for sticky header support
import {
  Download,
  Search,
  FileSpreadsheet,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import api from "@/lib/api";

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

// Header mapping from Google Sheets to our data structure
const HEADER_MAPPING: Record<string, keyof UniversityData> = {
  "University Name": "universityName",
  "Location/Province": "locationProvince",
  Campus: "campus",
  "CIP Codes": "cipCodes",
  Intake: "intake",
  "Courses Available": "coursesAvailable",
  "Tution Fees": "tuitionFees",
  "Course Type": "courseType",
  Duration: "duration",
  MOI: "moi",
  "IELTS- (L/R/W/S/OVERALL)": "ielts",
  "TOEFL- (L/R/W/S/OVERALL)": "toefl",
  "PTE- (L/R/W/S/OVERALL)": "pte",
  Duolingo: "duolingo",
  "Qualification Required": "qualificationRequired",
  "Backlogs Accepted": "backlogsAccepted",
  "GAP Accepted": "gapAccepted",
  "Percentage Accepted": "percentageAccepted",
  "PGWP Eligible": "pgwpEligible",
  Sowp: "sowpEligible",
  Category: "category",
  "Sub-Category": "subCategory",
};

// Function to parse 2D array response and convert to UniversityData[]
const parseGoogleSheetsData = (data: string[][]): UniversityData[] => {
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  // Create index mapping from header names to column indices
  const headerIndices: Record<string, number> = {};
  headers.forEach((header, index) => {
    const trimmedHeader = header?.trim();
    if (trimmedHeader && HEADER_MAPPING[trimmedHeader]) {
      headerIndices[HEADER_MAPPING[trimmedHeader]] = index;
    }
  });

  // Convert rows to UniversityData objects
  return rows
    .filter((row) => row && row.length > 0 && row.some((cell) => cell?.trim()))
    .map((row, index) => {
      const getValue = (key: keyof UniversityData): string => {
        const colIndex = headerIndices[key];
        return colIndex !== undefined && row[colIndex] !== undefined
          ? String(row[colIndex] || "").trim()
          : "";
      };

      return {
        srNo: index + 1,
        universityName: getValue("universityName"),
        locationProvince: getValue("locationProvince"),
        campus: getValue("campus"),
        cipCodes: getValue("cipCodes"),
        intake: getValue("intake"),
        coursesAvailable: getValue("coursesAvailable"),
        tuitionFees: getValue("tuitionFees"),
        courseType: getValue("courseType"),
        duration: getValue("duration"),
        moi: getValue("moi"),
        ielts: getValue("ielts"),
        toefl: getValue("toefl"),
        pte: getValue("pte"),
        duolingo: getValue("duolingo"),
        qualificationRequired: getValue("qualificationRequired"),
        backlogsAccepted: getValue("backlogsAccepted"),
        gapAccepted: getValue("gapAccepted"),
        percentageAccepted: getValue("percentageAccepted"),
        pgwpEligible: getValue("pgwpEligible"),
        sowpEligible: getValue("sowpEligible"),
        category: getValue("category"),
        subCategory: getValue("subCategory"),
      };
    });
};

export default function UniversityDatabase() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: "all",
    courseType: "all",
    intake: "all",
    tuitionFees: "",
    pgwpEligible: "all",
    sowpEligible: "all",
    category: "all",
  });
  // Column-specific filters (used for actual table filtering)
  const initialColumnFilters = {
    universityName: "",
    locationProvince: "",
    campus: "",
    cipCodes: "",
    intake: "",
    coursesAvailable: "",
    tuitionFees: "",
    courseType: "",
    duration: "",
    moi: "",
    ielts: "",
    toefl: "",
    pte: "",
    duolingo: "",
    qualificationRequired: "",
    backlogsAccepted: "",
    gapAccepted: "",
    percentageAccepted: "",
    pgwpEligible: "",
    sowpEligible: "",
    category: "",
    subCategory: "",
  };
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(initialColumnFilters);

  // Refs for header filter inputs: typing updates ref only (no re-render), so input stays responsive
  const pendingFiltersRef = useRef<Record<string, string>>({ ...initialColumnFilters });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clearKey, setClearKey] = useState(0);

  const handleFilterChange = (key: string, value: string) => {
    pendingFiltersRef.current[key] = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === "") {
      setColumnFilters((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    debounceRef.current = setTimeout(() => {
      setColumnFilters((prev) => ({ ...prev, ...pendingFiltersRef.current }));
      debounceRef.current = null;
    }, 300);
  };

  // Fetch data from Google Sheets API
  const {
    data: apiData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["university-data"],
    queryFn: async () => {
      const response = await api.get("/api/google-sheets/read", {
        params: {
          range: "Sheet1",
        },
      });
      return response.data;
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Parse the API response
  const data = useMemo(() => {
    if (!apiData?.success || !apiData?.data) return [];
    return parseGoogleSheetsData(apiData.data);
  }, [apiData]);

  // Filter data based on search, filters, and column filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.universityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.coursesAvailable.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.locationProvince.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.campus.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation =
        filters.location === "all" ||
        item.locationProvince.toLowerCase().includes(filters.location.toLowerCase());

      const matchesCourseType =
        filters.courseType === "all" ||
        item.courseType.toLowerCase().includes(filters.courseType.toLowerCase());

      const matchesIntake =
        filters.intake === "all" ||
        item.intake.toLowerCase().includes(filters.intake.toLowerCase());

      const matchesTuitionFees =
        filters.tuitionFees === "" ||
        item.tuitionFees.toLowerCase().includes(filters.tuitionFees.toLowerCase());

      const matchesPGWP =
        filters.pgwpEligible === "all" ||
        item.pgwpEligible.toLowerCase() === filters.pgwpEligible.toLowerCase();

      const matchesSOWP =
        filters.sowpEligible === "all" ||
        item.sowpEligible.toLowerCase() === filters.sowpEligible.toLowerCase();

      const matchesCategory =
        filters.category === "all" ||
        item.category.toLowerCase().includes(filters.category.toLowerCase());

      // Column-specific filters
      const matchesColumnFilters = Object.entries(columnFilters).every(
        ([key, value]) => {
          if (!value || value.trim() === "") return true;
          const itemValue = String(item[key as keyof UniversityData] || "").toLowerCase();
          return itemValue.includes(value.toLowerCase());
        }
      );

      return (
        matchesSearch &&
        matchesLocation &&
        matchesCourseType &&
        matchesIntake &&
        matchesTuitionFees &&
        matchesPGWP &&
        matchesSOWP &&
        matchesCategory &&
        matchesColumnFilters
      );
    });
  }, [data, searchTerm, filters, columnFilters]);

  // Get unique values for filters
  const uniqueLocations = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((i) => i.locationProvince.trim())
            .filter(Boolean)
            .sort()
        )
      ),
    [data]
  );

  const uniqueCourseTypes = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((i) => i.courseType.trim())
            .filter(Boolean)
            .sort()
        )
      ),
    [data]
  );

  const uniqueIntakes = useMemo(() => {
    const intakes = new Set<string>();
    data.forEach((item) => {
      const intakeStr = item.intake.toLowerCase();
      if (intakeStr.includes("jan")) intakes.add("Jan");
      if (intakeStr.includes("may")) intakes.add("May");
      if (intakeStr.includes("sep")) intakes.add("Sep");
      if (intakeStr.includes("feb")) intakes.add("Feb");
      if (intakeStr.includes("mar")) intakes.add("Mar");
      if (intakeStr.includes("apr")) intakes.add("Apr");
      if (intakeStr.includes("jun")) intakes.add("Jun");
      if (intakeStr.includes("jul")) intakes.add("Jul");
      if (intakeStr.includes("aug")) intakes.add("Aug");
      if (intakeStr.includes("oct")) intakes.add("Oct");
      if (intakeStr.includes("nov")) intakes.add("Nov");
      if (intakeStr.includes("dec")) intakes.add("Dec");
    });
    return Array.from(intakes).sort();
  }, [data]);

  const uniqueCategories = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((i) => i.category.trim())
            .filter(Boolean)
            .sort()
        )
      ),
    [data]
  );

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      location: "all",
      courseType: "all",
      intake: "all",
      tuitionFees: "",
      pgwpEligible: "all",
      sowpEligible: "all",
      category: "all",
    });
    const empty = { ...initialColumnFilters };
    setColumnFilters(empty);
    pendingFiltersRef.current = { ...empty };
    setClearKey((k) => k + 1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset.",
    });
  };

  const downloadExcel = () => {
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to download.",
        variant: "destructive",
      });
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "University Data");
      XLSX.writeFile(
        wb,
        `University_Database_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast({
        title: "Download Started",
        description: `${filteredData.length} records exported successfully.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <PageWrapper
      title="University List"
      breadcrumbs={[{ label: "University" }]}
    >
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            {/* <h1 className="text-2xl font-bold tracking-tight">University List</h1> */}
            {data.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {data.length} universities available
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              try {
                await refetch();
                toast({
                  title: "Data Refreshed",
                  description: "University data has been updated.",
                });
              } catch (error) {
                toast({
                  title: "Refresh Failed",
                  description: "Failed to refresh data. Please try again.",
                  variant: "destructive",
                });
              }
            }}
            disabled={isLoading}
            title="Refresh data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Filter Section */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <div className="flex items-center justify-between border-b pb-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {isFilterOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadExcel}
                disabled={filteredData.length === 0 || isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export ({filteredData.length})
              </Button>
            </div>
          </div>

          <CollapsibleContent className="space-y-4 pt-4 pb-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by university name, course, location, or campus..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Province/Location</Label>
                <Select
                  value={filters.location}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, location: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course Type</Label>
                <Select
                  value={filters.courseType}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, courseType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueCourseTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intake</Label>
                <Select
                  value={filters.intake}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, intake: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Intakes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Intakes</SelectItem>
                    {uniqueIntakes.map((intake) => (
                      <SelectItem key={intake} value={intake}>
                        {intake}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tuition Fees</Label>
                <Input
                  placeholder="Search tuition fees..."
                  value={filters.tuitionFees}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, tuitionFees: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>PGWP Eligible</Label>
                <Select
                  value={filters.pgwpEligible}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, pgwpEligible: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>SOWP Eligible</Label>
                <Select
                  value={filters.sowpEligible}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, sowpEligible: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Results Count */}
        {filteredData.length !== data.length && data.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} universities
          </div>
        )}

        {/* Data Table */}
        <div className="rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading university data...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-64 p-6">
              <FileSpreadsheet className="h-12 w-12 text-destructive mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">Failed to load data</p>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                {error instanceof Error
                  ? error.message
                  : "An error occurred while fetching university data."}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden">
              {/* Table Container with Sticky Header */}
              <div
                className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--muted) transparent",
                }}
              >
                <div className="relative w-full overflow-visible">
                  <table className="w-full caption-bottom text-sm border-collapse">
                    <thead className="sticky top-0 z-20 bg-background shadow-sm [&_tr]:border-b">
                    {/* Header Row */}
                    <tr className="bg-muted/50 border-b transition-colors hover:bg-muted/50">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-[60px]">Sr. No</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[200px]">University Name</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Location</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Campus</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px]">CIP Codes</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Intake</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[250px]">Courses</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Tuition Fees</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Type</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px]">Duration</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px]">MOI</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">IELTS</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">TOEFL</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px]">PTE</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px]">Duolingo</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Qualification</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Backlogs</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">GAP</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Percentage</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px]">PGWP</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px]">SOWP</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Category</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Sub-Category</th>
                  </tr>
                  {/* Filter Row */}
                  <tr className="bg-muted/30 border-b transition-colors">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-[60px] p-1"></th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[200px] p-1">
                      <Input
                        key={`filter-${clearKey}-universityName`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.universityName}
                        onChange={(e) =>
                          handleFilterChange("universityName", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px] p-1">
                      <Input
                        key={`filter-${clearKey}-locationProvince`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.locationProvince}
                        onChange={(e) =>
                          handleFilterChange("locationProvince", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-campus`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.campus}
                        onChange={(e) =>
                          handleFilterChange("campus", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px] p-1">
                      <Input
                        key={`filter-${clearKey}-cipCodes`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.cipCodes}
                        onChange={(e) =>
                          handleFilterChange("cipCodes", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px] p-1">
                      <Input
                        key={`filter-${clearKey}-intake`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.intake}
                        onChange={(e) =>
                          handleFilterChange("intake", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[250px] p-1">
                      <Input
                        key={`filter-${clearKey}-coursesAvailable`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.coursesAvailable}
                        onChange={(e) =>
                          handleFilterChange("coursesAvailable", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px] p-1">
                      <Input
                        key={`filter-${clearKey}-tuitionFees`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.tuitionFees}
                        onChange={(e) =>
                          handleFilterChange("tuitionFees", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-courseType`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.courseType}
                        onChange={(e) =>
                          handleFilterChange("courseType", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px] p-1">
                      <Input
                        key={`filter-${clearKey}-duration`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.duration}
                        onChange={(e) =>
                          handleFilterChange("duration", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] p-1">
                      <Input
                        key={`filter-${clearKey}-moi`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.moi}
                        onChange={(e) =>
                          handleFilterChange("moi", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-ielts`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.ielts}
                        onChange={(e) =>
                          handleFilterChange("ielts", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-toefl`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.toefl}
                        onChange={(e) =>
                          handleFilterChange("toefl", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px] p-1">
                      <Input
                        key={`filter-${clearKey}-pte`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.pte}
                        onChange={(e) =>
                          handleFilterChange("pte", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px] p-1">
                      <Input
                        key={`filter-${clearKey}-duolingo`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.duolingo}
                        onChange={(e) =>
                          handleFilterChange("duolingo", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px] p-1">
                      <Input
                        key={`filter-${clearKey}-qualificationRequired`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.qualificationRequired}
                        onChange={(e) =>
                          handleFilterChange("qualificationRequired", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-backlogsAccepted`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.backlogsAccepted}
                        onChange={(e) =>
                          handleFilterChange("backlogsAccepted", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-gapAccepted`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.gapAccepted}
                        onChange={(e) =>
                          handleFilterChange("gapAccepted", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-percentageAccepted`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.percentageAccepted}
                        onChange={(e) =>
                          handleFilterChange("percentageAccepted", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] p-1">
                      <Input
                        key={`filter-${clearKey}-pgwpEligible`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.pgwpEligible}
                        onChange={(e) =>
                          handleFilterChange("pgwpEligible", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] p-1">
                      <Input
                        key={`filter-${clearKey}-sowpEligible`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.sowpEligible}
                        onChange={(e) =>
                          handleFilterChange("sowpEligible", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[120px] p-1">
                      <Input
                        key={`filter-${clearKey}-category`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.category}
                        onChange={(e) =>
                          handleFilterChange("category", e.target.value)
                        }
                      />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[150px] p-1">
                      <Input
                        key={`filter-${clearKey}-subCategory`}
                        placeholder="Search..."
                        className="h-7 text-xs"
                        defaultValue={columnFilters.subCategory}
                        onChange={(e) =>
                          handleFilterChange("subCategory", e.target.value)
                        }
                      />
                    </th>
                  </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={23} className="p-8 text-center text-muted-foreground">
                        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No university data available.</p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={23} className="p-8 text-center text-muted-foreground">
                        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="mb-4">No universities match your search criteria.</p>
                        <Button variant="outline" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={index} className="border-b transition-colors hover:bg-muted/30">
                        <td className="p-2 align-middle font-medium">
                          {item.srNo || index + 1}
                        </td>
                        <td className="p-2 align-middle font-semibold">
                          {item.universityName || "-"}
                        </td>
                        <td className="p-2 align-middle">{item.locationProvince || "-"}</td>
                        <td className="p-2 align-middle">{item.campus || "-"}</td>
                        <td className="p-2 align-middle">{item.cipCodes || "-"}</td>
                        <td className="p-2 align-middle">{item.intake || "-"}</td>
                        <td
                          className="p-2 align-middle max-w-xs truncate"
                          title={item.coursesAvailable}
                        >
                          {item.coursesAvailable || "-"}
                        </td>
                        <td className="p-2 align-middle">{item.tuitionFees || "-"}</td>
                        <td className="p-2 align-middle">{item.courseType || "-"}</td>
                        <td className="p-2 align-middle">{item.duration || "-"}</td>
                        <td className="p-2 align-middle">{item.moi || "-"}</td>
                        <td className="p-2 align-middle text-xs">
                          {item.ielts || "-"}
                        </td>
                        <td className="p-2 align-middle text-xs">
                          {item.toefl || "-"}
                        </td>
                        <td className="p-2 align-middle text-xs">
                          {item.pte || "-"}
                        </td>
                        <td className="p-2 align-middle">{item.duolingo || "-"}</td>
                        <td className="p-2 align-middle text-xs">
                          {item.qualificationRequired || "-"}
                        </td>
                        <td className="p-2 align-middle">{item.backlogsAccepted || "-"}</td>
                        <td className="p-2 align-middle">{item.gapAccepted || "-"}</td>
                        <td className="p-2 align-middle">{item.percentageAccepted || "-"}</td>
                        <td className="p-2 align-middle">{item.pgwpEligible || "-"}</td>
                        <td className="p-2 align-middle">{item.sowpEligible || "-"}</td>
                        <td className="p-2 align-middle">{item.category || "-"}</td>
                        <td className="p-2 align-middle">{item.subCategory || "-"}</td>
                      </tr>
                    ))
                  )}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    >
      {children}
    </label>
  );
}
