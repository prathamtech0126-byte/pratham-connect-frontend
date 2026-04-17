
// import { useState, useEffect } from 'react';
// import { useLocation } from 'wouter';
// import { ArrowLeft, Plus, Trash2, Save, X, AlertCircle, FolderPlus, FileText, CheckCircle, ChevronRight } from 'lucide-react';
// import { PageWrapper } from '@/layout/PageWrapper';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Badge } from '@/components/ui/badge';
// import {
//   createChecklist,
//   createSection,
//   createItem,
//   fetchCategories,
//   fetchCountries,
//   fetchChecklists,
//   type CreateChecklistData,
//   type CreateSectionData,
//   type CreateItemData,
//   type ChecklistSummary,
// } from '@/api/checklist.api';

// interface SectionForm extends CreateSectionData {
//   id?: string;
//   items: ItemForm[];
//   isExisting?: boolean;
// }

// interface ItemForm extends CreateItemData {
//   id?: string;
// }

// export default function AddChecklistPage() {
//   const [, setLocation] = useLocation();
//   const [activeTab, setActiveTab] = useState('checklist');
//   const [categories, setCategories] = useState<any[]>([]);
//   const [countries, setCountries] = useState<any[]>([]);
//   const [existingChecklists, setExistingChecklists] = useState<ChecklistSummary[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);
  
//   // Mode selection
//   const [mode, setMode] = useState<'new' | 'existing'>('new');
//   const [selectedChecklistId, setSelectedChecklistId] = useState<string>('');
//   const [selectedChecklistTitle, setSelectedChecklistTitle] = useState<string>('');
  
//   // Checklist form state
//   const [checklistData, setChecklistData] = useState<CreateChecklistData>({
//     title: '',
//     subType: '',
//     countryId: null,
//     displayOrder: 0,
//     categoryId: '',
//   });
  
//   // Sections and items state
//   const [sections, setSections] = useState<SectionForm[]>([
//     { title: '', description: '', displayOrder: 0, isConditional: false, conditionText: '', items: [] }
//   ]);
  
//   const [createdChecklistId, setCreatedChecklistId] = useState<string | null>(null);

//   useEffect(() => {
//     fetchInitialData();
//     if (mode === 'existing') {
//       fetchExistingChecklists();
//     }
//   }, [mode]);

//   const fetchInitialData = async () => {
//     try {
//       const [cats, countriesData] = await Promise.all([
//         fetchCategories(),
//         fetchCountries(),
//       ]);
//       setCategories(cats);
//       setCountries(countriesData);
//     } catch (error) {
//       console.error('Error fetching initial data:', error);
//       setError('Failed to load categories and countries');
//     }
//   };

//   const fetchExistingChecklists = async () => {
//     try {
//       // Fetch all checklists (you might need to adjust this based on your API)
//       const allChecklists = await fetchChecklists('', null);
//       setExistingChecklists(allChecklists);
//     } catch (error) {
//       console.error('Error fetching existing checklists:', error);
//     }
//   };

//   const handleModeChange = (newMode: 'new' | 'existing') => {
//     setMode(newMode);
//     setError(null);
//     setSuccess(null);
//     if (newMode === 'existing') {
//       fetchExistingChecklists();
//     }
//   };

//   const handleChecklistSubmit = async () => {
//     if (!checklistData.title || !checklistData.categoryId) {
//       setError('Please fill in all required fields (Title and Category)');
//       return;
//     }
    
//     setError(null);
//     setSuccess(null);
//     setLoading(true);
//     try {
//       console.log('Creating checklist with data:', checklistData);
//       const result = await createChecklist(checklistData);
//       console.log('Checklist created:', result);
      
//       if (result.success && result.data.id) {
//         setCreatedChecklistId(result.data.id);
//         setSuccess('Checklist created successfully! Now you can add sections and items.');
//         setActiveTab('sections');
//       } else {
//         throw new Error('Failed to create checklist: Invalid response');
//       }
//     } catch (error: any) {
//       console.error('Error creating checklist:', error);
//       const errorMessage = error.response?.data?.message || error.message || 'Error creating checklist';
//       setError(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleExistingChecklistSelect = (checklistId: string) => {
//     const selected = existingChecklists.find(c => c.id === checklistId);
//     if (selected) {
//       setSelectedChecklistId(checklistId);
//       setSelectedChecklistTitle(selected.title);
//       setCreatedChecklistId(checklistId);
//       setSuccess(`Selected checklist: ${selected.title}. You can now add sections and items.`);
//       setActiveTab('sections');
//     }
//   };

//   const addSection = () => {
//     setSections([
//       ...sections,
//       { title: '', description: '', displayOrder: sections.length, isConditional: false, conditionText: '', items: [] }
//     ]);
//   };

//   const removeSection = (index: number) => {
//     setSections(sections.filter((_, i) => i !== index));
//   };

//   const updateSection = (index: number, field: keyof SectionForm, value: any) => {
//     const updated = [...sections];
//     updated[index] = { ...updated[index], [field]: value };
//     setSections(updated);
//   };

//   const addItem = (sectionIndex: number) => {
//     const updated = [...sections];
//     updated[sectionIndex].items.push({
//       name: '',
//       notes: '',
//       isMandatory: true,
//       isConditional: false,
//       conditionText: '',
//       quantityNote: '',
//       displayOrder: updated[sectionIndex].items.length,
//     });
//     setSections(updated);
//   };

//   const removeItem = (sectionIndex: number, itemIndex: number) => {
//     const updated = [...sections];
//     updated[sectionIndex].items = updated[sectionIndex].items.filter((_, i) => i !== itemIndex);
//     setSections(updated);
//   };

//   const updateItem = (sectionIndex: number, itemIndex: number, field: keyof ItemForm, value: any) => {
//     const updated = [...sections];
//     updated[sectionIndex].items[itemIndex] = { ...updated[sectionIndex].items[itemIndex], [field]: value };
//     setSections(updated);
//   };

//   const handleSectionsSubmit = async () => {
//     if (!createdChecklistId) {
//       setError('Please select or create a checklist first');
//       setActiveTab('checklist');
//       return;
//     }

//     setError(null);
//     setSuccess(null);
//     setLoading(true);
//     try {
//       let sectionCount = 0;
//       let itemCount = 0;
      
//       for (const section of sections) {
//         if (!section.title) continue;
        
//         console.log('Creating section:', section);
//         const sectionResult = await createSection(createdChecklistId, {
//           title: section.title,
//           description: section.description,
//           displayOrder: section.displayOrder,
//           isConditional: section.isConditional,
//           conditionText: section.conditionText,
//         });
        
//         sectionCount++;
//         const sectionId = sectionResult.data.id;
//         console.log('Section created:', sectionResult);
        
//         // Create items for this section
//         for (const item of section.items) {
//           if (!item.name) continue;
          
//           console.log('Creating item:', item);
//           await createItem(sectionId, {
//             name: item.name,
//             notes: item.notes,
//             isMandatory: item.isMandatory,
//             isConditional: item.isConditional,
//             conditionText: item.conditionText,
//             quantityNote: item.quantityNote,
//             displayOrder: item.displayOrder,
//           });
//           itemCount++;
//         }
//       }
      
//       setSuccess(`Successfully added ${sectionCount} section(s) and ${itemCount} item(s) to the checklist!`);
      
//       // Reset sections form for adding more
//       setSections([
//         { title: '', description: '', displayOrder: sections.length, isConditional: false, conditionText: '', items: [] }
//       ]);
      
//       // Optionally redirect after 2 seconds
//       setTimeout(() => {
//         setLocation('/checklists');
//       }, 2000);
//     } catch (error: any) {
//       console.error('Error creating sections/items:', error);
//       const errorMessage = error.response?.data?.message || error.message || 'Error creating sections/items';
//       setError(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <PageWrapper
//       title="Add Checklist Content"
//       breadcrumbs={[
//         { label: 'Checklists', href: '/checklists' },
//         { label: 'Add Content' },
//       ]}
//     >
//       <div className="max-w-5xl mx-auto space-y-6">
//         <Button
//           variant="ghost"
//           onClick={() => setLocation('/checklists')}
//           className="mb-2 text-slate-600 hover:text-[#0063cc]"
//         >
//           <ArrowLeft className="w-4 h-4 mr-2" />
//           Back to Checklists
//         </Button>

//         {error && (
//           <Alert variant="destructive" className="mb-4">
//             <AlertCircle className="h-4 w-4" />
//             <AlertDescription>{error}</AlertDescription>
//           </Alert>
//         )}

//         {success && (
//           <Alert className="mb-4 border-green-500 bg-green-50">
//             <CheckCircle className="h-4 w-4 text-green-500" />
//             <AlertDescription className="text-green-700">{success}</AlertDescription>
//           </Alert>
//         )}

//         {/* Mode Selection Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//           <Card 
//             className={`cursor-pointer transition-all duration-200 ${mode === 'new' ? 'border-[#0063cc] ring-2 ring-[#0063cc]/20' : 'hover:border-slate-300'}`}
//             onClick={() => handleModeChange('new')}
//           >
//             <CardContent className="p-6">
//               <div className="flex items-center gap-4">
//                 <div className={`p-3 rounded-full ${mode === 'new' ? 'bg-[#0063cc]' : 'bg-slate-100'}`}>
//                   <Plus className={`w-6 h-6 ${mode === 'new' ? 'text-white' : 'text-slate-400'}`} />
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-lg">Create New Checklist</h3>
//                   <p className="text-sm text-slate-500">Create a brand new checklist from scratch</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card 
//             className={`cursor-pointer transition-all duration-200 ${mode === 'existing' ? 'border-[#0063cc] ring-2 ring-[#0063cc]/20' : 'hover:border-slate-300'}`}
//             onClick={() => handleModeChange('existing')}
//           >
//             <CardContent className="p-6">
//               <div className="flex items-center gap-4">
//                 <div className={`p-3 rounded-full ${mode === 'existing' ? 'bg-[#0063cc]' : 'bg-slate-100'}`}>
//                   <FolderPlus className={`w-6 h-6 ${mode === 'existing' ? 'text-white' : 'text-slate-400'}`} />
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-lg">Add to Existing Checklist</h3>
//                   <p className="text-sm text-slate-500">Add sections and items to an existing checklist</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
//           <TabsList className="grid w-full grid-cols-2 bg-slate-100">
//             <TabsTrigger value="checklist" className="data-[state=active]:bg-white data-[state=active]:text-[#0063cc]">
//               {mode === 'new' ? 'Checklist Details' : 'Select Checklist'}
//             </TabsTrigger>
//             <TabsTrigger value="sections" disabled={!createdChecklistId} className="data-[state=active]:bg-white data-[state=active]:text-[#0063cc]">
//               Add Sections & Items
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="checklist">
//             <Card>
//               <CardHeader className="border-b border-slate-100">
//                 <CardTitle className="flex items-center gap-2">
//                   {mode === 'new' ? (
//                     <>
//                       <Plus className="w-5 h-5 text-[#0063cc]" />
//                       Create New Checklist
//                     </>
//                   ) : (
//                     <>
//                       <FolderPlus className="w-5 h-5 text-[#0063cc]" />
//                       Add to Existing Checklist
//                     </>
//                   )}
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 {mode === 'new' ? (
//                   <div className="space-y-5">
//                     <div>
//                       <Label htmlFor="title" className="text-sm font-semibold mb-2 block">
//                         Checklist Title <span className="text-red-500">*</span>
//                       </Label>
//                       <Input
//                         id="title"
//                         value={checklistData.title}
//                         onChange={(e) => setChecklistData({ ...checklistData, title: e.target.value })}
//                         placeholder="e.g., If the Spouse is on Work Permit"
//                         className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                       />
//                     </div>

//                     <div>
//                       <Label htmlFor="subType" className="text-sm font-semibold mb-2 block">
//                         Sub Type
//                       </Label>
//                       <Input
//                         id="subType"
//                         value={checklistData.subType}
//                         onChange={(e) => setChecklistData({ ...checklistData, subType: e.target.value })}
//                         placeholder="e.g., Work Permit, Extension"
//                         className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                       />
//                     </div>

//                     <div>
//                       <Label htmlFor="category" className="text-sm font-semibold mb-2 block">
//                         Category <span className="text-red-500">*</span>
//                       </Label>
//                       <Select
//                         value={checklistData.categoryId}
//                         onValueChange={(value) => setChecklistData({ ...checklistData, categoryId: value })}
//                       >
//                         <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
//                           <SelectValue placeholder="Select category" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {categories.map((cat) => (
//                             <SelectItem key={cat.id} value={cat.id}>
//                               <div className="flex items-center justify-between w-full">
//                                 <span>{cat.name}</span>
//                                 <Badge variant="secondary" className="ml-2">{cat.checklistCount}</Badge>
//                               </div>
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     <div>
//                       <Label htmlFor="country" className="text-sm font-semibold mb-2 block">
//                         Country (Optional)
//                       </Label>
//                       <Select
//                         value={checklistData.countryId || 'none'}
//                         onValueChange={(value) => setChecklistData({ ...checklistData, countryId: value === 'none' ? null : value })}
//                       >
//                         <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
//                           <SelectValue placeholder="All Countries" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="none">🌍 All Countries</SelectItem>
//                           {countries.map((country) => (
//                             <SelectItem key={country.id} value={country.id}>
//                               {country.name}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     <div>
//                       <Label htmlFor="displayOrder" className="text-sm font-semibold mb-2 block">
//                         Display Order
//                       </Label>
//                       <Input
//                         id="displayOrder"
//                         type="number"
//                         value={checklistData.displayOrder}
//                         onChange={(e) => setChecklistData({ ...checklistData, displayOrder: parseInt(e.target.value) })}
//                         className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                       />
//                     </div>

//                     <div className="flex gap-3 pt-4">
//                       <Button onClick={handleChecklistSubmit} disabled={loading} className="bg-[#0063cc] hover:bg-[#0052a3]">
//                         <Save className="w-4 h-4 mr-2" />
//                         {loading ? 'Creating...' : 'Create Checklist & Continue'}
//                       </Button>
//                       <Button variant="outline" onClick={() => setLocation('/checklists')}>
//                         Cancel
//                       </Button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-5">
//                     <div>
//                       <Label htmlFor="existingChecklist" className="text-sm font-semibold mb-2 block">
//                         Select Existing Checklist <span className="text-red-500">*</span>
//                       </Label>
//                       <Select
//                         value={selectedChecklistId}
//                         onValueChange={handleExistingChecklistSelect}
//                       >
//                         <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
//                           <SelectValue placeholder="Choose a checklist to add content to" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {existingChecklists.map((checklist) => (
//                             <SelectItem key={checklist.id} value={checklist.id}>
//                               <div className="flex items-center justify-between w-full">
//                                 <span>{checklist.title}</span>
//                                 <div className="flex gap-2 ml-4">
//                                   {checklist.subType && (
//                                     <Badge variant="outline" className="text-xs">{checklist.subType}</Badge>
//                                   )}
//                                   <Badge variant="secondary" className="text-xs">
//                                     {checklist.sectionCount} sections
//                                   </Badge>
//                                 </div>
//                               </div>
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     {selectedChecklistId && (
//                       <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
//                         <div className="flex items-center gap-2">
//                           <CheckCircle className="w-5 h-5 text-[#0063cc]" />
//                           <div>
//                             <p className="text-sm font-medium text-[#0063cc]">Selected Checklist:</p>
//                             <p className="text-sm text-slate-700">{selectedChecklistTitle}</p>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     <div className="flex gap-3 pt-4">
//                       <Button 
//                         onClick={() => setActiveTab('sections')} 
//                         disabled={!selectedChecklistId}
//                         className="bg-[#0063cc] hover:bg-[#0052a3]"
//                       >
//                         Continue to Add Sections
//                         <ChevronRight className="w-4 h-4 ml-2" />
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="sections">
//             <Card>
//               <CardHeader className="border-b border-slate-100">
//                 <CardTitle className="flex items-center gap-2">
//                   <FileText className="w-5 h-5 text-[#0063cc]" />
//                   Add Sections and Documents
//                 </CardTitle>
//                 <p className="text-sm text-slate-500 mt-1">
//                   {mode === 'new' 
//                     ? `Adding content to: ${checklistData.title || 'New Checklist'}`
//                     : `Adding content to: ${selectedChecklistTitle}`
//                   }
//                 </p>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <div className="space-y-6">
//                   {sections.map((section, sectionIndex) => (
//                     <div key={sectionIndex} className="border rounded-lg p-5 space-y-4 bg-white shadow-sm">
//                       <div className="flex justify-between items-start">
//                         <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
//                           <span className="w-8 h-8 rounded-full bg-[#0063cc]/10 text-[#0063cc] flex items-center justify-center text-sm font-bold">
//                             {sectionIndex + 1}
//                           </span>
//                           Section {sectionIndex + 1}
//                         </h3>
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => removeSection(sectionIndex)}
//                           className="text-red-500 hover:text-red-700 hover:bg-red-50"
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </Button>
//                       </div>

//                       <div>
//                         <Label className="text-sm font-semibold mb-2 block">Section Title *</Label>
//                         <Input
//                           value={section.title}
//                           onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
//                           placeholder="e.g., Documents Required from Canada"
//                           className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                         />
//                       </div>

//                       <div>
//                         <Label className="text-sm font-semibold mb-2 block">Description (Optional)</Label>
//                         <Textarea
//                           value={section.description || ''}
//                           onChange={(e) => updateSection(sectionIndex, 'description', e.target.value)}
//                           placeholder="Section description or instructions"
//                           className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                           rows={2}
//                         />
//                       </div>

//                       <div className="grid grid-cols-2 gap-4">
//                         <div>
//                           <Label className="text-sm font-semibold mb-2 block">Display Order</Label>
//                           <Input
//                             type="number"
//                             value={section.displayOrder}
//                             onChange={(e) => updateSection(sectionIndex, 'displayOrder', parseInt(e.target.value))}
//                             className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                           />
//                         </div>
//                         <div className="flex items-center">
//                           <label className="flex items-center gap-2 cursor-pointer">
//                             <input
//                               type="checkbox"
//                               checked={section.isConditional}
//                               onChange={(e) => updateSection(sectionIndex, 'isConditional', e.target.checked)}
//                               className="rounded border-slate-300 text-[#0063cc] focus:ring-[#0063cc]"
//                             />
//                             <span className="text-sm font-medium">Conditional Section</span>
//                           </label>
//                         </div>
//                       </div>

//                       {section.isConditional && (
//                         <div>
//                           <Label className="text-sm font-semibold mb-2 block">Condition Text</Label>
//                           <Input
//                             value={section.conditionText || ''}
//                             onChange={(e) => updateSection(sectionIndex, 'conditionText', e.target.value)}
//                             placeholder="e.g., Only if applicant has a child"
//                             className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                           />
//                         </div>
//                       )}

//                       {/* Items/Documents */}
//                       <div className="pl-6 space-y-3 mt-4">
//                         <Label className="text-md font-semibold text-slate-700 flex items-center gap-2">
//                           <FileText className="w-4 h-4" />
//                           Documents/Items
//                         </Label>
                        
//                         {section.items.map((item, itemIndex) => (
//                           <div key={itemIndex} className="border-l-2 border-[#0063cc] pl-4 space-y-2 bg-slate-50/50 p-3 rounded-r-lg">
//                             <div className="flex justify-between items-start">
//                               <h4 className="font-medium text-slate-700">Item {itemIndex + 1}</h4>
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 onClick={() => removeItem(sectionIndex, itemIndex)}
//                                 className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
//                               >
//                                 <X className="w-4 h-4" />
//                               </Button>
//                             </div>

//                             <div>
//                               <Label className="text-sm font-semibold mb-1 block">Document Name *</Label>
//                               <Input
//                                 value={item.name}
//                                 onChange={(e) => updateItem(sectionIndex, itemIndex, 'name', e.target.value)}
//                                 placeholder="e.g., Passport"
//                                 className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                               />
//                             </div>

//                             <div>
//                               <Label className="text-sm font-semibold mb-1 block">Notes (Optional)</Label>
//                               <Textarea
//                                 value={item.notes || ''}
//                                 onChange={(e) => updateItem(sectionIndex, itemIndex, 'notes', e.target.value)}
//                                 placeholder="Additional notes or instructions"
//                                 className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                                 rows={2}
//                               />
//                             </div>

//                             <div>
//                               <Label className="text-sm font-semibold mb-1 block">Quantity Note</Label>
//                               <Input
//                                 value={item.quantityNote || ''}
//                                 onChange={(e) => updateItem(sectionIndex, itemIndex, 'quantityNote', e.target.value)}
//                                 placeholder="e.g., Min. 4,000 CAD, 9-10 photos"
//                                 className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                               />
//                             </div>

//                             <div className="flex gap-4">
//                               <label className="flex items-center gap-2 cursor-pointer">
//                                 <input
//                                   type="checkbox"
//                                   checked={item.isMandatory}
//                                   onChange={(e) => updateItem(sectionIndex, itemIndex, 'isMandatory', e.target.checked)}
//                                   className="rounded border-slate-300 text-[#0063cc] focus:ring-[#0063cc]"
//                                 />
//                                 <span className="text-sm">Mandatory</span>
//                               </label>
//                               <label className="flex items-center gap-2 cursor-pointer">
//                                 <input
//                                   type="checkbox"
//                                   checked={item.isConditional}
//                                   onChange={(e) => updateItem(sectionIndex, itemIndex, 'isConditional', e.target.checked)}
//                                   className="rounded border-slate-300 text-[#0063cc] focus:ring-[#0063cc]"
//                                 />
//                                 <span className="text-sm">Conditional</span>
//                               </label>
//                             </div>

//                             {item.isConditional && (
//                               <div>
//                                 <Label className="text-sm font-semibold mb-1 block">Condition Text</Label>
//                                 <Input
//                                   value={item.conditionText || ''}
//                                   onChange={(e) => updateItem(sectionIndex, itemIndex, 'conditionText', e.target.value)}
//                                   placeholder="e.g., Only if applicant has dependents"
//                                   className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                                 />
//                               </div>
//                             )}

//                             <div>
//                               <Label className="text-sm font-semibold mb-1 block">Display Order</Label>
//                               <Input
//                                 type="number"
//                                 value={item.displayOrder}
//                                 onChange={(e) => updateItem(sectionIndex, itemIndex, 'displayOrder', parseInt(e.target.value))}
//                                 className="focus:ring-[#0063cc] focus:border-[#0063cc]"
//                               />
//                             </div>
//                           </div>
//                         ))}

//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => addItem(sectionIndex)}
//                           className="mt-2 border-[#0063cc] text-[#0063cc] hover:bg-[#0063cc]/10"
//                         >
//                           <Plus className="w-4 h-4 mr-2" />
//                           Add Document
//                         </Button>
//                       </div>
//                     </div>
//                   ))}

//                   <div className="flex gap-3">
//                     <Button variant="outline" onClick={addSection} className="border-[#0063cc] text-[#0063cc] hover:bg-[#0063cc]/10">
//                       <Plus className="w-4 h-4 mr-2" />
//                       Add Another Section
//                     </Button>
//                     <Button onClick={handleSectionsSubmit} disabled={loading} className="bg-[#0063cc] hover:bg-[#0052a3]">
//                       <Save className="w-4 h-4 mr-2" />
//                       {loading ? 'Saving...' : 'Save All Sections & Items'}
//                     </Button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </PageWrapper>
//   );
// }



// client/src/pages/AddChecklistPage.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Plus, Trash2, Save, X, AlertCircle,
  FolderPlus, FileText, FileCheck, File, Archive, CheckCircle, ChevronRight,
  Globe, BookOpen, Hash, Tag, Settings2, Loader2, Check, ChevronsUpDown,
} from 'lucide-react';
import { PageWrapper } from '@/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  createChecklist,
  createSection,
  createItem,
  fetchCategories,
  fetchCountries,
  fetchChecklists,
  createCountry,
  type CreateChecklistData,
  type CreateSectionData,
  type CreateItemData,
  type ChecklistSummary,
} from '@/api/checklist.api';
import { COUNTRY_LIST } from '@/data/countries';

function getFriendlyError(error: any, fallback = 'Something went wrong. Please try again.'): string {
  const serverMsg: string | undefined = error?.response?.data?.message;
  if (serverMsg) return serverMsg;

  const status: number | undefined = error?.response?.status;
  if (status) {
    if (status === 400) return 'The information provided is invalid. Please review your inputs and try again.';
    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return "You don't have permission to perform this action.";
    if (status === 404) return 'The requested resource could not be found.';
    if (status === 409) return error?.message || 'A conflict occurred. This entry may already exist.';
    if (status >= 500) return 'A server error occurred. Please try again in a moment, or contact support if the problem persists.';
  }

  const msg: string = error?.message || '';
  if (/network error/i.test(msg)) return 'Unable to connect. Please check your internet connection and try again.';
  if (/timeout/i.test(msg)) return 'The request timed out. Please try again.';
  if (/request failed/i.test(msg)) return 'A server error occurred. Please try again in a moment.';

  return fallback;
}

interface SectionForm extends CreateSectionData {
  id?: string;
  items: ItemForm[];
  isExisting?: boolean;
}

interface ItemForm extends CreateItemData {
  id?: string;
}

export default function AddChecklistPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('checklist');
  const [categories, setCategories] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [existingChecklists, setExistingChecklists] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Mode selection
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>('');
  const [selectedChecklistTitle, setSelectedChecklistTitle] = useState<string>('');
  const [checklistSearch, setChecklistSearch] = useState<string>('');
  
  // Checklist form state
  const [checklistData, setChecklistData] = useState<CreateChecklistData>({
    visaCategoryId: '',
    title: '',
    subType: '',
    countryId: null,
    slug: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [slugError, setSlugError] = useState<string | null>(null);
  
  // Sections and items state
  const [sections, setSections] = useState<SectionForm[]>([
    { title: '', description: '', displayOrder: 0, isConditional: false, conditionText: '', items: [] }
  ]);
  
  const [createdChecklistId, setCreatedChecklistId] = useState<string | null>(null);

  // ── Add Country dialog state ──────────────────────────────────────────────
  const [countryDialogOpen, setCountryDialogOpen] = useState(false);
  const [countryComboOpen, setCountryComboOpen] = useState(false);
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryError, setCountryError] = useState<string | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countrySuccess, setCountrySuccess] = useState<string | null>(null);

  const openCountryDialog = () => {
    setCountryName('');
    setCountryCode('');
    setCountryError(null);
    setCountrySuccess(null);
    setCountryComboOpen(false);
    setCountryDialogOpen(true);
  };

  const handleAddCountry = async () => {
    if (!countryName.trim()) { setCountryError('Country name is required.'); return; }
    if (!countryCode.trim()) { setCountryError('Country code is required (e.g. CA, IN, UK).'); return; }
    setCountryError(null);
    setCountryLoading(true);
    try {
      const result = await createCountry({ name: countryName.trim(), code: countryCode.trim() });
      if (result.success) {
        setCountrySuccess(`"${result.data.name}" added successfully.`);
        // Refresh countries list
        const updated = await fetchCountries();
        setCountries(updated);
        setCountryName('');
        setCountryCode('');
        setTimeout(() => setCountryDialogOpen(false), 1200);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setCountryError('A country with that name or code already exists.');
      } else if (status === 400) {
        setCountryError(err?.response?.data?.error?.message || 'Invalid input. Please check your values.');
      } else {
        setCountryError('Something went wrong. Please try again.');
      }
    } finally {
      setCountryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    if (mode === 'existing') {
      fetchExistingChecklists();
    }
  }, [mode]);

  const fetchInitialData = async () => {
    try {
      const [cats, countriesData] = await Promise.all([
        fetchCategories(),
        fetchCountries(),
      ]);
      setCategories(cats);
      setCountries(countriesData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Unable to load form data. Please refresh the page and try again.');
    }
  };

  const fetchExistingChecklists = async () => {
    try {
      const allChecklists = await fetchChecklists('', null);
      setExistingChecklists(allChecklists);
    } catch (error) {
      console.error('Error fetching existing checklists:', error);
    }
  };

  const handleModeChange = (newMode: 'new' | 'existing') => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setActiveTab('checklist');
    // Reset existing-checklist selection whenever mode changes
    setSelectedChecklistId('');
    setSelectedChecklistTitle('');
    setCreatedChecklistId(null);
    setChecklistSearch('');
    if (newMode === 'existing') {
      fetchExistingChecklists();
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Going back to the selection step in existing mode: clear the previous pick
    if (tab === 'checklist' && mode === 'existing') {
      setSelectedChecklistId('');
      setSelectedChecklistTitle('');
      setCreatedChecklistId(null);
      setChecklistSearch('');
      setSuccess(null);
      setError(null);
    }
  };

  const handleChecklistSubmit = async () => {
    if (!checklistData.title || !checklistData.visaCategoryId) {
      setError('Title and Category are required. Please fill in all highlighted fields before continuing.');
      return;
    }

    setError(null);
    setSlugError(null);
    setSuccess(null);
    setLoading(true);

    // Strip empty optional strings so backend doesn't receive empty values
    const payload: CreateChecklistData = {
      ...checklistData,
      slug: checklistData.slug?.trim() || undefined,
      description: checklistData.description?.trim() || undefined,
      subType: checklistData.subType?.trim() || undefined,
    };

    try {
      const result = await createChecklist(payload);

      if (result.success && result.data.id) {
        setCreatedChecklistId(result.data.id);
        setSuccess('Checklist created! Now add sections and documents in the next step.');
        setActiveTab('sections');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error creating checklist:', error);
      const status = error.response?.status;
      if (status === 409) {
        setSlugError(error.response?.data?.message || 'This slug is already taken. Please choose a different one.');
      } else {
        setError(getFriendlyError(error, 'Failed to create the checklist. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExistingChecklistSelect = (checklistId: string) => {
    const selected = existingChecklists.find(c => c.id === checklistId);
    if (selected) {
      setSelectedChecklistId(checklistId);
      setSelectedChecklistTitle(selected.title);
      setCreatedChecklistId(checklistId);
      setSuccess(`"${selected.title}" selected. You can now add sections and documents below.`);
      setActiveTab('sections');
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      { title: '', description: '', displayOrder: sections.length, isConditional: false, conditionText: '', items: [] }
    ]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: keyof SectionForm, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const addItem = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].items.push({
      name: '',
      notes: '',
      isMandatory: true,
      isConditional: false,
      conditionText: '',
      quantityNote: '',
      displayOrder: updated[sectionIndex].items.length,
    });
    setSections(updated);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].items = updated[sectionIndex].items.filter((_, i) => i !== itemIndex);
    setSections(updated);
  };

  const updateItem = (sectionIndex: number, itemIndex: number, field: keyof ItemForm, value: any) => {
    const updated = [...sections];
    updated[sectionIndex].items[itemIndex] = { ...updated[sectionIndex].items[itemIndex], [field]: value };
    setSections(updated);
  };

  const handleSectionsSubmit = async () => {
    if (!createdChecklistId) {
      setError('No checklist selected. Please create a new checklist or select an existing one before adding sections.');
      setActiveTab('checklist');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      let sectionCount = 0;
      let itemCount = 0;
      
      for (const section of sections) {
        if (!section.title) continue;
        
        const sectionResult = await createSection(createdChecklistId, {
          title: section.title,
          description: section.description,
          displayOrder: section.displayOrder,
          isConditional: section.isConditional,
          conditionText: section.conditionText,
        });
        
        sectionCount++;
        const sectionId = sectionResult.data.id;
        
        for (const item of section.items) {
          if (!item.name) continue;
          
          await createItem(sectionId, {
            name: item.name,
            notes: item.notes,
            isMandatory: item.isMandatory,
            isConditional: item.isConditional,
            conditionText: item.conditionText,
            quantityNote: item.quantityNote,
            displayOrder: item.displayOrder,
          });
          itemCount++;
        }
      }
      
      setSuccess(
        `${sectionCount} section${sectionCount !== 1 ? 's' : ''} and ${itemCount} document${itemCount !== 1 ? 's' : ''} added successfully. Redirecting to checklists…`
      );

      setSections([
        { title: '', description: '', displayOrder: sections.length, isConditional: false, conditionText: '', items: [] }
      ]);

      setTimeout(() => {
        setLocation('/checklists');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating sections/items:', error);
      setError(getFriendlyError(error, 'Failed to save sections and documents. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Add Checklist Content"
      breadcrumbs={[
        { label: 'Checklists', href: '/checklists' },
        { label: 'Add Content' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/checklists')}
          className="mb-2 text-slate-600 hover:text-[#0063cc]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Checklists
        </Button>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${mode === 'new' ? 'border-[#0063cc] shadow-md ring-2 ring-[#0063cc]/20' : 'hover:border-slate-300'}`}
            onClick={() => handleModeChange('new')}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${mode === 'new' ? 'bg-[#0063cc]' : 'bg-slate-100'}`}>
                  <Plus className={`w-6 h-6 ${mode === 'new' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Create New Checklist</h3>
                  <p className="text-sm text-slate-500">Create a brand new checklist from scratch with sections and documents</p>
                  {mode === 'new' && (
                    <Badge className="mt-3 bg-[#0063cc]/10 text-[#0063cc] hover:bg-[#0063cc]/20">Selected</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${mode === 'existing' ? 'border-[#0063cc] shadow-md ring-2 ring-[#0063cc]/20' : 'hover:border-slate-300'}`}
            onClick={() => handleModeChange('existing')}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${mode === 'existing' ? 'bg-[#0063cc]' : 'bg-slate-100'}`}>
                  <FolderPlus className={`w-6 h-6 ${mode === 'existing' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Add to Existing Checklist</h3>
                  <p className="text-sm text-slate-500">Add new sections and documents to an existing checklist</p>
                  {mode === 'existing' && (
                    <Badge className="mt-3 bg-[#0063cc]/10 text-[#0063cc] hover:bg-[#0063cc]/20">Selected</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100">
            <TabsTrigger value="checklist" className="data-[state=active]:bg-white data-[state=active]:text-[#0063cc]">
              <BookOpen className="w-4 h-4 mr-2" />
              {mode === 'new' ? 'Checklist Details' : 'Select Checklist'}
            </TabsTrigger>
            <TabsTrigger value="sections" disabled={!createdChecklistId} className="data-[state=active]:bg-white data-[state=active]:text-[#0063cc]">
              <FileText className="w-4 h-4 mr-2" />
              Add Sections & Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {mode === 'new' ? (
                    <>
                      <div className="p-2 bg-[#0063cc]/10 rounded-lg">
                        <Plus className="w-5 h-5 text-[#0063cc]" />
                      </div>
                      Create New Checklist
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-[#0063cc]/10 rounded-lg">
                        <FolderPlus className="w-5 h-5 text-[#0063cc]" />
                      </div>
                      Add to Existing Checklist
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {mode === 'new' 
                    ? 'Fill in the details below to create a new checklist' 
                    : 'Select an existing checklist to add new sections and documents'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {mode === 'new' ? (
                  <div className="space-y-8">

                    {/* ── Group 1: Basic Info ───────────────────────────── */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#0063cc]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Basic Info</span>
                      </div>
                      <Separator />

                      <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-1">
                          Checklist Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="title"
                          value={checklistData.title}
                          onChange={(e) => setChecklistData({ ...checklistData, title: e.target.value })}
                          placeholder="e.g., Student Visa – Canada"
                          className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-sm font-semibold">
                          Description{' '}
                          <span className="text-xs font-normal text-slate-400">(optional)</span>
                        </Label>
                        <Textarea
                          id="description"
                          value={checklistData.description || ''}
                          onChange={(e) => setChecklistData({ ...checklistData, description: e.target.value })}
                          placeholder="Brief description of what this checklist covers…"
                          className="focus:ring-[#0063cc] focus:border-[#0063cc] resize-none"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* ── Group 2: Classification ───────────────────────── */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#0063cc]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Classification</span>
                      </div>
                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-1">
                            Visa Category <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={checklistData.visaCategoryId}
                            onValueChange={(value) => setChecklistData({ ...checklistData, visaCategoryId: value })}
                          >
                            <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{cat.name}</span>
                                    <Badge variant="secondary" className="text-xs">{cat.checklistCount}</Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="subType" className="text-sm font-semibold">
                            Sub Type{' '}
                            <span className="text-xs font-normal text-slate-400">(optional)</span>
                          </Label>
                          <Input
                            id="subType"
                            value={checklistData.subType || ''}
                            onChange={(e) => setChecklistData({ ...checklistData, subType: e.target.value })}
                            placeholder="e.g., Work Permit, Extension"
                            className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
  <Label htmlFor="country" className="text-sm font-semibold flex items-center gap-1.5">
    <Globe className="w-3.5 h-3.5 text-slate-400" />
    Country
  </Label>
  <div className="flex gap-2">
    <Select
      value={checklistData.countryId || '__all__'}
      onValueChange={(value) =>
        setChecklistData({ ...checklistData, countryId: value === '__all__' ? null : value })
      }
    >
      <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc] flex-1">
        <SelectValue placeholder="All Countries" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">🌍 All Countries</SelectItem>
        {countries.map((country) => (
          <SelectItem key={country.id} value={country.id}>
            {country.name} ({country.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openCountryDialog}
      className="h-10 px-3 text-sm border-[#0063cc] text-[#0063cc] hover:bg-[#0063cc]/10 gap-1 whitespace-nowrap"
    >
      <Plus className="w-4 h-4" />
      Add Country
    </Button>
  </div>
</div>

                      {/* <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="country" className="text-sm font-semibold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            Country{' '}
                            <span className="text-xs font-normal text-slate-400">(optional)</span>
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openCountryDialog}
                            className="h-7 px-2 text-xs border-[#0063cc] text-[#0063cc] hover:bg-[#0063cc]/10 gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Country
                          </Button>
                        </div>
                        <Select
                          value={checklistData.countryId || '__all__'}
                          onValueChange={(value) =>
                            setChecklistData({ ...checklistData, countryId: value === '__all__' ? null : value })
                          }
                        >
                          <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
                            <SelectValue placeholder="All Countries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">🌍 All Countries</SelectItem>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.name} ({country.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div> */}
                    </div>

                    {/* ── Group 3: Advanced ─────────────────────────────── */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-[#0063cc]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Advanced</span>
                      </div>
                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="slug" className="text-sm font-semibold">
                            URL Slug{' '}
                            <span className="text-xs font-normal text-slate-400">(optional)</span>
                          </Label>
                          <Input
                            id="slug"
                            value={checklistData.slug || ''}
                            onChange={(e) => {
                              setChecklistData({ ...checklistData, slug: e.target.value });
                              if (slugError) setSlugError(null);
                            }}
                            placeholder="auto-generated from title"
                            className={`focus:ring-[#0063cc] focus:border-[#0063cc] ${slugError ? 'border-red-400 focus:ring-red-400' : ''}`}
                          />
                          {slugError ? (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />{slugError}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-1">Leave blank to auto-generate from title</p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="displayOrder" className="text-sm font-semibold flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-slate-400" />
                            Display Order
                          </Label>
                          <Input
                            id="displayOrder"
                            type="number"
                            min={0}
                            value={checklistData.displayOrder ?? 0}
                            onChange={(e) =>
                              setChecklistData({ ...checklistData, displayOrder: parseInt(e.target.value) || 0 })
                            }
                            className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                          />
                        </div>
                      </div>

                      {/* Is Active toggle */}
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Active Status</p>
                          <p className="text-xs text-slate-400 mt-0.5">Inactive checklists are hidden from users</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              checklistData.isActive
                                ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-100'
                            }
                          >
                            {checklistData.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch
                            checked={checklistData.isActive ?? true}
                            onCheckedChange={(checked) =>
                              setChecklistData({ ...checklistData, isActive: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Actions ───────────────────────────────────────── */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleChecklistSubmit}
                        disabled={loading}
                        className="bg-[#0063cc] hover:bg-[#0052a3] flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Create Checklist &amp; Continue
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setLocation('/checklists')}>
                        Cancel
                      </Button>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Search */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-[#0063cc]" />
                        Select Existing Checklist <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                        <Input
                          value={checklistSearch}
                          onChange={(e) => setChecklistSearch(e.target.value)}
                          placeholder="Search checklists…"
                          className="pl-9 focus:ring-[#0063cc] focus:border-[#0063cc]"
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        {existingChecklists.length} checklist{existingChecklists.length !== 1 ? 's' : ''} available
                      </p>
                    </div>

                    {/* Checklist list */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {existingChecklists.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-sm">
                            No checklists found
                          </div>
                        ) : (() => {
                          const filtered = existingChecklists.filter((c) =>
                            c.title.toLowerCase().includes(checklistSearch.toLowerCase()) ||
                            (c.subType || '').toLowerCase().includes(checklistSearch.toLowerCase())
                          );
                          return filtered.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-sm">
                              No checklists match "{checklistSearch}"
                            </div>
                          ) : (
                            filtered.map((checklist) => {
                              const isSelected = selectedChecklistId === checklist.id;
                              return (
                                <button
                                  key={checklist.id}
                                  type="button"
                                  onClick={() => handleExistingChecklistSelect(checklist.id)}
                                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                                    isSelected
                                      ? 'bg-[#0063cc]/8 border-l-4 border-l-[#0063cc]'
                                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#0063cc] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      {isSelected
                                        ? <CheckCircle className="w-4 h-4" />
                                        : <FileText className="w-4 h-4" />
                                      }
                                    </div>
                                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-[#0063cc]' : 'text-slate-800'}`}>
                                      {checklist.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {checklist.subType && (
                                      <Badge variant="outline" className="text-xs text-slate-500">{checklist.subType}</Badge>
                                    )}
                                    <Badge className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-100">
                                      {checklist.sectionCount} section{checklist.sectionCount !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                </button>
                              );
                            })
                          );
                        })()}
                      </div>
                    </div>

                    {/* Selected banner */}
                    {selectedChecklistId && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-white rounded-lg shrink-0">
                            <CheckCircle className="w-5 h-5 text-[#0063cc]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#0063cc] uppercase tracking-wide">Selected Checklist</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{selectedChecklistTitle}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChecklistId('');
                            setSelectedChecklistTitle('');
                            setCreatedChecklistId(null);
                            setSuccess(null);
                            setChecklistSearch('');
                          }}
                          className="shrink-0 text-xs text-slate-500 hover:text-red-500 underline underline-offset-2 transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    )}

                    <Separator className="my-4" />

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => setActiveTab('sections')}
                        disabled={!selectedChecklistId}
                        className="bg-[#0063cc] hover:bg-[#0052a3]"
                      >
                        Continue to Add Sections
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-[#0063cc]/10 rounded-lg">
                    <FileCheck className="w-5 h-5 text-[#0063cc]" />
                  </div>
                  Add Sections and Documents
                </CardTitle>
                <CardDescription>
                  {mode === 'new' 
                    ? `Adding content to: ${checklistData.title || 'New Checklist'}`
                    : `Adding content to: ${selectedChecklistTitle}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {sections.map((section, sectionIndex) => (
                    <Card key={sectionIndex} className="border-2 hover:border-[#0063cc]/30 transition-all duration-200">
                      {/* Section header */}
                      <CardHeader className="bg-slate-50/50 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0063cc]/10 text-[#0063cc] flex items-center justify-center text-sm font-bold">
                              {sectionIndex + 1}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-tight">Section {sectionIndex + 1}</h3>
                              <p className="text-xs text-slate-500 hidden sm:block">Add documents and requirements for this section</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(sectionIndex)}
                            className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5">
                        {/* Section Title */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#0063cc]" />
                            Section Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                            placeholder="e.g., Documents Required from Canada"
                            className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-[#0063cc]" />
                            Description <span className="text-xs font-normal text-slate-400">(Optional)</span>
                          </Label>
                          <Textarea
                            value={section.description || ''}
                            onChange={(e) => updateSection(sectionIndex, 'description', e.target.value)}
                            placeholder="Section description or instructions"
                            className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                            rows={2}
                          />
                        </div>

                        {/* Display Order + Conditional — stack on mobile, side-by-side on sm+ */}
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                          <div className="space-y-1.5 w-full sm:w-40">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <Hash className="w-4 h-4 text-[#0063cc]" />
                              Display Order
                            </Label>
                            <Input
                              type="number"
                              value={section.displayOrder}
                              onChange={(e) => updateSection(sectionIndex, 'displayOrder', parseInt(e.target.value))}
                              className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer pb-1 sm:pb-2">
                            <input
                              type="checkbox"
                              checked={section.isConditional}
                              onChange={(e) => updateSection(sectionIndex, 'isConditional', e.target.checked)}
                              className="rounded border-slate-300 text-[#0063cc] focus:ring-[#0063cc]"
                            />
                            <span className="text-sm font-medium">Conditional Section</span>
                          </label>
                        </div>

                        {section.isConditional && (
                          <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Condition Text</Label>
                            <Input
                              value={section.conditionText || ''}
                              onChange={(e) => updateSection(sectionIndex, 'conditionText', e.target.value)}
                              placeholder="e.g., Only if applicant has a child"
                              className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                            />
                          </div>
                        )}

                        <Separator className="my-1" />

                        {/* Documents */}
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Archive className="w-4 h-4 text-[#0063cc]" />
                            Documents & Requirements
                          </p>

                          {section.items.map((item, itemIndex) => (
                            <Card key={itemIndex} className="border-l-4 border-l-[#0063cc] bg-slate-50/30">
                              <CardContent className="px-3 pt-3 pb-3 sm:px-4 sm:pt-4">
                                {/* Doc header */}
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                    <File className="w-4 h-4 text-[#0063cc] shrink-0" />
                                    Document {itemIndex + 1}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(sectionIndex, itemIndex)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>

                                {/* Name + Quantity — stack on mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm font-semibold">Document Name <span className="text-red-500">*</span></Label>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => updateItem(sectionIndex, itemIndex, 'name', e.target.value)}
                                      placeholder="e.g., Passport"
                                      className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm font-semibold">
                                      Quantity Note <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                    </Label>
                                    <Input
                                      value={item.quantityNote || ''}
                                      onChange={(e) => updateItem(sectionIndex, itemIndex, 'quantityNote', e.target.value)}
                                      placeholder="e.g., Min. 4,000 CAD"
                                      className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                                    />
                                  </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5 mt-3">
                                  <Label className="text-sm font-semibold">
                                    Notes <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                  </Label>
                                  <Textarea
                                    value={item.notes || ''}
                                    onChange={(e) => updateItem(sectionIndex, itemIndex, 'notes', e.target.value)}
                                    placeholder="Additional notes or instructions"
                                    className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                                    rows={2}
                                  />
                                </div>

                                {/* Checkboxes — wrap on mobile */}
                                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.isMandatory}
                                      onChange={(e) => updateItem(sectionIndex, itemIndex, 'isMandatory', e.target.checked)}
                                      className="rounded border-slate-300 text-[#0063cc] focus:ring-[#0063cc]"
                                    />
                                    <span className="text-sm">Mandatory</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.isConditional}
                                      onChange={(e) => updateItem(sectionIndex, itemIndex, 'isConditional', e.target.checked)}
                                      className="rounded border-slate-300 text-[#0063cc] focus:ring-[#0063cc]"
                                    />
                                    <span className="text-sm">Conditional</span>
                                  </label>
                                </div>

                                {item.isConditional && (
                                  <div className="space-y-1.5 mt-3">
                                    <Label className="text-sm font-semibold">Condition Text</Label>
                                    <Input
                                      value={item.conditionText || ''}
                                      onChange={(e) => updateItem(sectionIndex, itemIndex, 'conditionText', e.target.value)}
                                      placeholder="e.g., Only if applicant has dependents"
                                      className="focus:ring-[#0063cc] focus:border-[#0063cc]"
                                    />
                                  </div>
                                )}

                                {/* Display Order — compact */}
                                <div className="flex items-center gap-3 mt-3">
                                  <Label className="text-sm font-semibold shrink-0">
                                    <Hash className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                                    Order
                                  </Label>
                                  <Input
                                    type="number"
                                    value={item.displayOrder}
                                    onChange={(e) => updateItem(sectionIndex, itemIndex, 'displayOrder', parseInt(e.target.value))}
                                    className="focus:ring-[#0063cc] focus:border-[#0063cc] w-20"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(sectionIndex)}
                            className="w-full sm:w-auto mt-1 border-[#0063cc] text-[#0063cc] hover:bg-[#0063cc]/10"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Document
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Bottom actions — stack on mobile */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={addSection}
                      className="w-full sm:w-auto border-[#0063cc] text-[#0063cc] hover:bg-[#0063cc]/10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Section
                    </Button>
                    <Button
                      onClick={handleSectionsSubmit}
                      disabled={loading}
                      className="w-full sm:w-auto bg-[#0063cc] hover:bg-[#0052a3]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving…' : 'Save All Sections & Documents'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* ── Add Country Dialog ── */}
      <Dialog open={countryDialogOpen} onOpenChange={(open) => {
        if (!countryLoading) setCountryDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0063cc]" />
              Add New Country
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {countryError && (
              <Alert variant="destructive">
                <AlertDescription>{countryError}</AlertDescription>
              </Alert>
            )}
            {countrySuccess && (
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription className="text-green-700">{countrySuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <p className="text-sm font-semibold">
                Select Country <span className="text-red-500">*</span>
              </p>
              <Popover open={countryComboOpen} onOpenChange={setCountryComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryComboOpen}
                    disabled={countryLoading}
                    className="w-full justify-between font-normal text-slate-700 hover:text-slate-900"
                  >
                    {countryName ? (
                      <span className="flex items-center gap-2">
                        <span>{countryName}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                          {countryCode}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Search country…</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder="Type to search…" className="h-9" />
                    <CommandList className="max-h-60">
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRY_LIST.map((c) => (
                          <CommandItem
                            key={c.code}
                            value={`${c.name} ${c.code}`}
                            onSelect={() => {
                              setCountryName(c.name);
                              setCountryCode(c.code);
                              setCountryError(null);
                              setCountryComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${countryCode === c.code ? 'opacity-100 text-[#0063cc]' : 'opacity-0'}`}
                            />
                            <span className="flex-1">{c.name}</span>
                            <span className="ml-2 text-xs font-mono text-slate-400">{c.code}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCountryDialogOpen(false)}
              disabled={countryLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddCountry}
              disabled={countryLoading}
              className="bg-[#0063cc] hover:bg-[#0052a3]"
            >
              {countryLoading ? 'Adding…' : 'Add Country'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}