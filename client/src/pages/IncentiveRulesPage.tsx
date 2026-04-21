import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/layout/PageWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpouseRulesTab } from '@/components/incentives/SpouseRulesTab'
import { VisitorRulesTab } from '@/components/incentives/VisitorRulesTab'
import { StudentRulesTab } from '@/components/incentives/StudentRulesTab'
import { UkStudentRulesTab } from '@/components/incentives/UkStudentRulesTab'
import { AllFinanceRulesTab } from '@/components/incentives/AllFinanceRulesTab'
import { fetchIncentiveRules } from '@/api/incentives.api'

export default function IncentiveRulesPage() {
  const { data: rules, isLoading, isError } = useQuery({
    queryKey: ['incentive-rules'],
    queryFn: fetchIncentiveRules,
  })

  return (
    <PageWrapper
      title="Incentive Rules"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Incentives', href: '/incentives' },
        { label: 'Rules' },
      ]}
    >
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading rules...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16 text-destructive text-sm">
            Failed to load incentive rules. Please refresh the page.
          </div>
        )}

        {rules && (
          <Tabs defaultValue="spouse">
            <TabsList className="mb-4">
              <TabsTrigger value="spouse">Spouse</TabsTrigger>
              <TabsTrigger value="visitor">Visitor</TabsTrigger>
              <TabsTrigger value="canada-student">Canada Student</TabsTrigger>
              <TabsTrigger value="uk-student">Student</TabsTrigger>
              <TabsTrigger value="all-finance">All Finance</TabsTrigger>
            </TabsList>

            <TabsContent value="spouse">
              <SpouseRulesTab rules={rules} />
            </TabsContent>

            <TabsContent value="visitor">
              <VisitorRulesTab rules={rules} />
            </TabsContent>

            <TabsContent value="canada-student">
              <StudentRulesTab rules={rules} />
            </TabsContent>

            <TabsContent value="uk-student">
              <UkStudentRulesTab rules={rules} />
            </TabsContent>

            <TabsContent value="all-finance">
              <AllFinanceRulesTab rules={rules} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageWrapper>
  )
}
