import { PageWrapper } from '@/layout/PageWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpouseRulesTab } from '@/components/incentives/SpouseRulesTab'
import { VisitorRulesTab } from '@/components/incentives/VisitorRulesTab'
import { StudentRulesTab } from '@/components/incentives/StudentRulesTab'

export default function IncentiveRulesPage() {
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
        <Tabs defaultValue="spouse">
          <TabsList className="mb-4">
            <TabsTrigger value="spouse">Spouse Rules</TabsTrigger>
            <TabsTrigger value="visitor">Visitor Rules</TabsTrigger>
            <TabsTrigger value="student">Student Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="spouse">
            <SpouseRulesTab />
          </TabsContent>

          <TabsContent value="visitor">
            <VisitorRulesTab />
          </TabsContent>

          <TabsContent value="student">
            <StudentRulesTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
