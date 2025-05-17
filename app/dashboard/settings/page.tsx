"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { CustomFieldDialog, type CustomField } from "@/components/custom-field-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    otpVerification: true,
    autoAssign: false,
    darkMode: false,
  })
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // In a real app, fetch settings from database
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching settings:", error)
        setIsLoading(false)
      }
    }

    const fetchCustomFields = async () => {
      try {
        const customFieldsCollection = collection(db, "customFields")
        const customFieldsSnapshot = await getDocs(customFieldsCollection)
        const customFieldsList = customFieldsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomField[]

        setCustomFields(customFieldsList)
      } catch (error) {
        console.error("Error fetching custom fields:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
    fetchCustomFields()
  }, [])

  const handleSettingChange = (setting: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [setting]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // In a real app, save settings to database
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCustomFieldSaved = async (field: CustomField) => {
    try {
      if (field.id) {
        // Update existing field
        const fieldRef = doc(db, "customFields", field.id)
        await updateDoc(fieldRef, {
          name: field.name,
          label: field.label || field.name,
          type: field.type,
          required: field.required,
          defaultValue: field.defaultValue || "",
          options: field.options || [],
          updatedAt: serverTimestamp(),
        })

        setCustomFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...field, label: field.label || field.name } : f)),
        )

        toast({
          title: "Field Updated",
          description: "Custom field has been updated successfully",
        })
      } else {
        // Add new field
        const newField = {
          name: field.name,
          label: field.label || field.name,
          type: field.type,
          required: field.required,
          defaultValue: field.defaultValue || "",
          options: field.options || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        const docRef = await addDoc(collection(db, "customFields"), newField)
        setCustomFields((prev) => [...prev, { ...newField, id: docRef.id }])

        toast({
          title: "Field Added",
          description: "New custom field has been added successfully",
        })
      }
    } catch (error) {
      console.error("Error saving custom field:", error)
      toast({
        title: "Error",
        description: "Failed to save custom field. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setIsCustomFieldDialogOpen(true)
  }

  const handleDeleteField = (fieldId: string) => {
    setFieldToDelete(fieldId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteField = async () => {
    if (!fieldToDelete) return

    try {
      await deleteDoc(doc(db, "customFields", fieldToDelete))
      setCustomFields((prev) => prev.filter((field) => field.id !== fieldToDelete))

      toast({
        title: "Field Deleted",
        description: "Custom field has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting custom field:", error)
      toast({
        title: "Error",
        description: "Failed to delete custom field. Please try again.",
        variant: "destructive",
      })
    } finally {
      setFieldToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="customFields">Custom Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your general application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Enable dark mode for the application</p>
                </div>
                <Switch
                  id="darkMode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => handleSettingChange("darkMode", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoAssign">Auto Assign</Label>
                  <p className="text-sm text-muted-foreground">Automatically assign RMAs to service technicians</p>
                </div>
                <Switch
                  id="autoAssign"
                  checked={settings.autoAssign}
                  onCheckedChange={(checked) => handleSettingChange("autoAssign", checked)}
                />
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="smsNotifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => handleSettingChange("smsNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="otpVerification">OTP Verification</Label>
                  <p className="text-sm text-muted-foreground">Enable OTP verification for RMA delivery confirmation</p>
                </div>
                <Switch
                  id="otpVerification"
                  checked={settings.otpVerification}
                  onCheckedChange={(checked) => handleSettingChange("otpVerification", checked)}
                />
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customFields" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Custom Fields</CardTitle>
                <CardDescription>Manage custom fields for RMA forms</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingField(null)
                  setIsCustomFieldDialogOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No custom fields added yet.</p>
                  <p className="text-sm mt-1">
                    Click the "Add Field" button to create custom fields for your RMA forms.
                  </p>
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{field.label || field.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{field.type}</span>
                          {field.required && (
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">Required</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditField(field)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteField(field.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomFieldDialog
        open={isCustomFieldDialogOpen}
        onOpenChange={setIsCustomFieldDialogOpen}
        onFieldSaved={handleCustomFieldSaved}
        editField={editingField}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom field. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteField} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
