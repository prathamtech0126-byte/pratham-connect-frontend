import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-auto shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 bg-white">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-0"
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
    </div>
  );
}
