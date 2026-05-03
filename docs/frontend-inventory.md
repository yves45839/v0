# Frontend Inventory

Genere automatiquement le 2026-04-04T08:51:18.023Z.

## Resume
- Pages (routes): 7
- Fichiers avec popups/fenetres contextuelles: 9
- Fichiers avec messages d'erreurs detectes: 9
- Fichiers composants (dans `components/`): 74
- Fichiers hooks (dans `hooks/`): 2

## Pages
| Route | Titre | Fichier | Fenetres contextuelles detectees | Nb messages d'erreurs |
| --- | --- | --- | --- | --- |
| `/access-logs` | Journal d'acces | `app/access-logs/page.tsx` | - | 3 |
| `/devices` | Appareils | `app/devices/page.tsx` | Dialog x3, DropdownMenu x1, window.confirm x2 | 16 |
| `/employees` | Employes | `app/employees/page.tsx` | Dialog x1 | 7 |
| `/` | DashboardPage | `app/page.tsx` | - | 0 |
| `/planning` | Planning | `app/planning/page.tsx` | Dialog x3, window.confirm x4 | 17 |
| `/reports` | Rapports | `app/reports/page.tsx` | Popover x1, DropdownMenu x1 | 14 |
| `/settings` | Parametres | `app/settings/page.tsx` | Dialog x4 | 12 |

## Fenetres contextuelles (Dialog, Drawer, Popover, Dropdown, Confirm)
| Fichier | Occurrences | Titres de dialogue detectes |
| --- | --- | --- |
| `app/devices/page.tsx` | Dialog x3, DropdownMenu x1, window.confirm x2 | `Ajouter un appareil (API Hikvision)`, `Modifier l&apos;appareil` |
| `app/employees/page.tsx` | Dialog x1 | `Creer un quart de travail` |
| `app/planning/page.tsx` | Dialog x3, window.confirm x4 | - |
| `app/reports/page.tsx` | Popover x1, DropdownMenu x1 | - |
| `app/settings/page.tsx` | Dialog x4 | - |
| `components/dashboard/header.tsx` | DropdownMenu x1 | - |
| `components/employees/add-employee-modal.tsx` | Dialog x1 | - |
| `components/employees/employee-table.tsx` | Dialog x2, DropdownMenu x1 | - |
| `components/planning/hr-planning-guide-dialog.tsx` | Dialog x1 | `Assistant RH - Attribution des quarts` |

## Messages D'Erreurs
### `app/access-logs/page.tsx`
- Impossible de charger les evenements.
- Impossible de charger les personnes.
- Le rattrapage des evenements a echoue.

### `app/devices/page.tsx`
- Erreur chargement des appareils
- Erreur inattendue
- Erreur modification appareil
- Erreur ouverture configuration appareil
- Erreur redemarrage appareil
- Erreur suppression appareil
- Impossible d'ouvrir la configuration: id local introuvable. Lance une synchronisation puis reessaie.
- Impossible de modifier: id local introuvable. Lance une synchronisation puis reessaie.
- Impossible de redemarrer: id local introuvable. Lance une synchronisation puis reessaie.
- Impossible de supprimer: id local introuvable. Lance une synchronisation puis reessaie.
- Le champ device_password est obligatoire.
- Le champ ehome_key est obligatoire.
- Le champ serial_number/sn est obligatoire.
- Le champ tenant_code est obligatoire.
- Le nom est obligatoire.
- URL de configuration introuvable pour cet appareil.

### `app/employees/page.tsx`
- Erreur d'attribution du quart de travail
- Erreur de changement de departement
- Erreur de chargement des employes
- Erreur de creation du quart de travail
- Erreur de mise a jour des groupes d'acces
- Le nom du quart est obligatoire.
- Tenant introuvable pour creer un quart de travail.

### `app/planning/page.tsx`
- Erreur d'assignation du planning.
- Erreur de chargement du calendrier.
- Erreur de chargement du planning.
- Erreur de creation du planning.
- Erreur de creation du quart.
- Erreur de modification du planning.
- Erreur de modification du quart.
- Erreur de suppression du shift.
- Erreur de suppression du timetable.
- Impossible de preparer l'attribution rapide depuis l'assistant RH.
- Le nom du planning est obligatoire.
- Le nom du quart est obligatoire.
- Les heures de pause sont invalides (format attendu HH:MM).
- Les heures de service sont invalides (format attendu HH:MM).
- Les heures week-end sont invalides (format attendu HH:MM).
- Tenant introuvable pour creer le planning.
- Tenant introuvable pour creer le quart.

### `app/reports/page.tsx`
- arrival_time is required
- departure_time is required
- Heure d'arrivee invalide ou incomplete. Exemple valide: 08:00.
- Heure d'arrivee obligatoire.
- Heure de debut pause invalide. Exemple valide: 12:30.
- Heure de depart invalide ou incomplete. Exemple valide: 17:00.
- Heure de depart obligatoire.
- Heure de fin pause invalide. Exemple valide: 13:00.
- Impossible d'enregistrer la correction.
- Impossible d'exporter le rapport.
- Impossible de charger annuaire personnes/departements.
- Impossible de charger la correction.
- Impossible de charger le rapport.
- Tenant introuvable pour cette personne. Configure NEXT_PUBLIC_HIK_EVENTS_TENANT ou charge un rapport filtre par tenant.

### `app/settings/page.tsx`
- Erreur d'attribution du quart au departement.
- Erreur lors de l'attribution du planning.
- Erreur lors de l'enregistrement du departement.
- Erreur lors de l'enregistrement du groupe.
- Erreur lors de l'enregistrement du planning.
- Erreur lors de l'enregistrement du quart.
- Erreur lors de la suppression de l'attribution.
- Erreur lors de la suppression du departement.
- Erreur lors de la suppression du groupe.
- Erreur lors de la suppression du planning.
- Erreur lors de la suppression du quart.
- Impossible de charger les groupes d'acces.

### `components/employees/add-employee-modal.tsx`
- Capture empreinte impossible
- Departement invalide
- Email invalide
- Enrolement visage impossible
- Erreur API employee
- Identifiant API employe invalide.
- Identifiant employe invalide apres creation.
- Impossible de charger la photo.
- Impossible de charger les lecteurs en ligne
- Impossible de lire le fichier image.
- Impossible de modifier cet employe: identifiant API manquant
- Lecture de carte impossible

### `components/planning/hr-planning-guide-dialog.tsx`
- Heures de pause invalides. Format attendu: HH:MM.
- Heures de service invalides. Format attendu: HH:MM.
- Heures week-end invalides. Format attendu: HH:MM.

### `lib/api/employees.ts`
- Card read error (ACS search)

## Catalogue Des Composants
### dashboard
| Fichier | Exports |
| --- | --- |
| `components/dashboard/access-stream.tsx` | `AccessStream` |
| `components/dashboard/app-sidebar.tsx` | `AppSidebar` |
| `components/dashboard/dashboard-overview.tsx` | `DashboardOverview` |
| `components/dashboard/device-health.tsx` | `DeviceHealth` |
| `components/dashboard/header.tsx` | `Header` |
| `components/dashboard/kpi-cards.tsx` | `KPICards` |
| `components/dashboard/page-context-bar.tsx` | `PageContextBar` |
| `components/dashboard/priority-actions.tsx` | `PriorityActions` |
| `components/dashboard/types.ts` | - |

### employees
| Fichier | Exports |
| --- | --- |
| `components/employees/add-employee-modal.tsx` | `AddEmployeeModal` |
| `components/employees/employee-drawer.tsx` | `EmployeeDrawer` |
| `components/employees/employee-filters.tsx` | `EmployeeFilters` |
| `components/employees/employee-stats.tsx` | `EmployeeStats` |
| `components/employees/employee-table.tsx` | `EmployeeTable` |
| `components/employees/organization-tree.tsx` | `OrganizationTree` |

### planning
| Fichier | Exports |
| --- | --- |
| `components/planning/hr-planning-guide-dialog.tsx` | `HrPlanningGuideDialog` |

### root
| Fichier | Exports |
| --- | --- |
| `components/theme-provider.tsx` | `ThemeProvider` |

### ui
| Fichier | Exports |
| --- | --- |
| `components/ui/accordion.tsx` | `Accordion`, `AccordionContent`, `AccordionItem`, `AccordionTrigger` |
| `components/ui/alert-dialog.tsx` | `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogOverlay`, `AlertDialogPortal`, `AlertDialogTitle`, `AlertDialogTrigger` |
| `components/ui/alert.tsx` | `Alert`, `AlertDescription`, `AlertTitle` |
| `components/ui/aspect-ratio.tsx` | `AspectRatio` |
| `components/ui/avatar.tsx` | `Avatar`, `AvatarFallback`, `AvatarImage` |
| `components/ui/badge.tsx` | `Badge`, `badgeVariants` |
| `components/ui/breadcrumb.tsx` | `Breadcrumb`, `BreadcrumbEllipsis`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbList`, `BreadcrumbPage`, `BreadcrumbSeparator` |
| `components/ui/button-group.tsx` | `ButtonGroup`, `ButtonGroupSeparator`, `ButtonGroupText`, `buttonGroupVariants` |
| `components/ui/button.tsx` | `Button`, `buttonVariants` |
| `components/ui/calendar.tsx` | `Calendar`, `CalendarDayButton` |
| `components/ui/card.tsx` | `Card`, `CardAction`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle` |
| `components/ui/carousel.tsx` | `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselNext`, `CarouselPrevious` |
| `components/ui/chart.tsx` | `ChartContainer`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, `ChartTooltip`, `ChartTooltipContent` |
| `components/ui/checkbox.tsx` | `Checkbox` |
| `components/ui/collapsible.tsx` | `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` |
| `components/ui/command.tsx` | `Command`, `CommandDialog`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList`, `CommandSeparator`, `CommandShortcut` |
| `components/ui/context-menu.tsx` | `ContextMenu`, `ContextMenuCheckboxItem`, `ContextMenuContent`, `ContextMenuGroup`, `ContextMenuItem`, `ContextMenuLabel`, `ContextMenuPortal`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuTrigger` |
| `components/ui/dialog.tsx` | `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger` |
| `components/ui/drawer.tsx` | `Drawer`, `DrawerClose`, `DrawerContent`, `DrawerDescription`, `DrawerFooter`, `DrawerHeader`, `DrawerOverlay`, `DrawerPortal`, `DrawerTitle`, `DrawerTrigger` |
| `components/ui/dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuCheckboxItem`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuPortal`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuTrigger` |
| `components/ui/empty.tsx` | `Empty`, `EmptyContent`, `EmptyDescription`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle` |
| `components/ui/field.tsx` | `Field`, `FieldContent`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLabel`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldTitle` |
| `components/ui/form.tsx` | `Form`, `FormControl`, `FormDescription`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`, `useFormField` |
| `components/ui/hover-card.tsx` | `HoverCard`, `HoverCardContent`, `HoverCardTrigger` |
| `components/ui/input-group.tsx` | `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupInput`, `InputGroupText`, `InputGroupTextarea` |
| `components/ui/input-otp.tsx` | `InputOTP`, `InputOTPGroup`, `InputOTPSeparator`, `InputOTPSlot` |
| `components/ui/input.tsx` | `Input` |
| `components/ui/item.tsx` | `Item`, `ItemActions`, `ItemContent`, `ItemDescription`, `ItemFooter`, `ItemGroup`, `ItemHeader`, `ItemMedia`, `ItemSeparator`, `ItemTitle` |
| `components/ui/kbd.tsx` | `Kbd`, `KbdGroup` |
| `components/ui/label.tsx` | `Label` |
| `components/ui/menubar.tsx` | `Menubar`, `MenubarCheckboxItem`, `MenubarContent`, `MenubarGroup`, `MenubarItem`, `MenubarLabel`, `MenubarMenu`, `MenubarPortal`, `MenubarRadioGroup`, `MenubarRadioItem`, `MenubarSeparator`, `MenubarShortcut`, `MenubarSub`, `MenubarSubContent`, `MenubarSubTrigger`, `MenubarTrigger` |
| `components/ui/navigation-menu.tsx` | `NavigationMenu`, `NavigationMenuContent`, `NavigationMenuIndicator`, `NavigationMenuItem`, `NavigationMenuLink`, `NavigationMenuList`, `NavigationMenuTrigger`, `navigationMenuTriggerStyle`, `NavigationMenuViewport` |
| `components/ui/pagination.tsx` | `Pagination`, `PaginationContent`, `PaginationEllipsis`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious` |
| `components/ui/popover.tsx` | `Popover`, `PopoverAnchor`, `PopoverContent`, `PopoverTrigger` |
| `components/ui/progress.tsx` | `Progress` |
| `components/ui/radio-group.tsx` | `RadioGroup`, `RadioGroupItem` |
| `components/ui/resizable.tsx` | `ResizableHandle`, `ResizablePanel`, `ResizablePanelGroup` |
| `components/ui/scroll-area.tsx` | `ScrollArea`, `ScrollBar` |
| `components/ui/select.tsx` | `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator`, `SelectTrigger`, `SelectValue` |
| `components/ui/separator.tsx` | `Separator` |
| `components/ui/sheet.tsx` | `Sheet`, `SheetClose`, `SheetContent`, `SheetDescription`, `SheetFooter`, `SheetHeader`, `SheetTitle`, `SheetTrigger` |
| `components/ui/sidebar.tsx` | `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarHeader`, `SidebarInput`, `SidebarInset`, `SidebarMenu`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarProvider`, `SidebarRail`, `SidebarSeparator`, `SidebarTrigger`, `useSidebar` |
| `components/ui/skeleton.tsx` | `Skeleton` |
| `components/ui/slider.tsx` | `Slider` |
| `components/ui/sonner.tsx` | `Toaster` |
| `components/ui/spinner.tsx` | `Spinner` |
| `components/ui/switch.tsx` | `Switch` |
| `components/ui/table.tsx` | `Table`, `TableBody`, `TableCaption`, `TableCell`, `TableFooter`, `TableHead`, `TableHeader`, `TableRow` |
| `components/ui/tabs.tsx` | `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` |
| `components/ui/textarea.tsx` | `Textarea` |
| `components/ui/toast.tsx` | `Toast`, `ToastAction`, `ToastClose`, `ToastDescription`, `ToastProvider`, `ToastTitle`, `ToastViewport` |
| `components/ui/toaster.tsx` | `Toaster` |
| `components/ui/toggle-group.tsx` | `ToggleGroup`, `ToggleGroupItem` |
| `components/ui/toggle.tsx` | `Toggle`, `toggleVariants` |
| `components/ui/tooltip.tsx` | `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` |
| `components/ui/use-mobile.tsx` | `useIsMobile` |
| `components/ui/use-toast.ts` | `reducer`, `toast`, `useToast` |

## Hooks Frontend
| Fichier | Exports |
| --- | --- |
| `hooks/use-mobile.ts` | `useIsMobile` |
| `hooks/use-toast.ts` | `reducer`, `toast`, `useToast` |
