import React from "react";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [inputDate, setInputDate] = React.useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-8">
      <Card className="w-auto shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader>
            <CardTitle className="text-center">Simple React Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-white">
            <SimpleCalendar
              value={date}
              onChange={(val) => {
                  if (val instanceof Date) setDate(val);
                  else if (Array.isArray(val) && val[0]) setDate(val[0]);
              }}
            />
            <div className="flex justify-end mt-2 px-3 pb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium h-8 px-3 rounded-md"
                onClick={() => setDate(undefined)}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-sm shadow-lg border-0 rounded-2xl">
        <CardHeader>
            <CardTitle>Date Input Component</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Select a date
                    </label>
                    <DateInput 
                        value={inputDate} 
                        onChange={setInputDate} 
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    Selected: {inputDate ? inputDate.toDateString() : "None"}
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
