
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  Save, 
  Link, 
  Building, 
  Home, 
  Plus, 
  RefreshCw
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

// Types for our data
interface Building {
  id: string;
  name: string;
  address: string | null;
}

interface Apartment {
  id: string;
  building_id: string;
  apartment_number: string;
  resident_name: string | null;
}

interface Doorbell {
  id: string;
  user_id: string;
  apartment_id: string | null;
  webhook_url: string | null;
  enabled: boolean;
}

interface ApartmentWithBuilding extends Apartment {
  building_name: string;
}

const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<ApartmentWithBuilding[]>([]);
  const [doorbells, setDoorbells] = useState<Doorbell[]>([]);
  const [selectedDoorbell, setSelectedDoorbell] = useState<Doorbell | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Load data on component mount
  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          toast({
            title: "New doorbell ring!",
            description: `${payload.new.visitor_name} is at the door`,
          });
          fetchData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*');
      
      if (buildingsError) throw buildingsError;
      
      // Fetch apartments with building details
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select(`
          *,
          buildings(name)
        `);
      
      if (apartmentsError) throw apartmentsError;
      
      // Fetch doorbells
      const { data: doorbellsData, error: doorbellsError } = await supabase
        .from('doorbells')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (doorbellsError) throw doorbellsError;
      
      // Fetch recent notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          *,
          doorbells(id, webhook_url)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (notificationsError) throw notificationsError;
      
      // Format apartments with building name
      const apartmentsWithBuilding = apartmentsData.map((apt: any) => ({
        ...apt,
        building_name: apt.buildings?.name || 'Unknown Building'
      }));
      
      setBuildings(buildingsData);
      setApartments(apartmentsWithBuilding);
      setDoorbells(doorbellsData);
      setNotifications(notificationsData);
      
      // Select first doorbell if available and none selected
      if (doorbellsData.length > 0 && !selectedDoorbell) {
        setSelectedDoorbell(doorbellsData[0]);
        setWebhookUrl(doorbellsData[0].webhook_url || '');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoorbell) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('doorbells')
        .update({ webhook_url: webhookUrl })
        .eq('id', selectedDoorbell.id);
      
      if (error) throw error;
      
      toast({
        title: "Settings saved",
        description: "Your Discord webhook has been updated successfully.",
      });
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error saving webhook:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSelectDoorbell = (doorbell: Doorbell) => {
    setSelectedDoorbell(doorbell);
    setWebhookUrl(doorbell.webhook_url || '');
  };
  
  // Initial setup - create a building and apartment if none exist
  const handleInitialSetup = async () => {
    if (buildings.length > 0) return;
    
    setIsSaving(true);
    
    try {
      // Create default building
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .insert({
          name: 'My Home',
          address: '123 Main St'
        })
        .select()
        .single();
      
      if (buildingError) {
        console.error('Building creation error:', buildingError);
        throw buildingError;
      }
      
      console.log('Created building:', building);
      
      // Create default apartment
      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .insert({
          building_id: building.id,
          apartment_number: 'Main Door',
          resident_name: user?.name
        })
        .select()
        .single();
      
      if (apartmentError) {
        console.error('Apartment creation error:', apartmentError);
        throw apartmentError;
      }
      
      console.log('Created apartment:', apartment);
      
      if (!user?.id) {
        console.error('No user ID found, cannot create doorbell');
        throw new Error('No user ID found');
      }
      
      // Create doorbell for the user
      const { data: doorbell, error: doorbellError } = await supabase
        .from('doorbells')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          webhook_url: null
        })
        .select()
        .single();
      
      if (doorbellError) {
        console.error('Doorbell creation error:', doorbellError);
        throw doorbellError;
      }
      
      console.log('Created doorbell:', doorbell);
      
      toast({
        title: "Setup Complete",
        description: "Default building and doorbell created successfully.",
      });
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error in initial setup:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to create default setup",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Admin Panel</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} title="Refresh data">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={logout}>
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {buildings.length === 0 ? (
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Welcome to Digital Doorbell</h3>
              <p className="mb-4">You don't have any buildings or doorbells set up yet. Let's create your first doorbell.</p>
              
              <Button onClick={handleInitialSetup} disabled={isSaving}>
                <Plus size={16} className="mr-2" />
                {isSaving ? 'Setting up...' : 'Create My First Doorbell'}
              </Button>
            </div>
          ) : (
            <>
              {/* Recent notifications */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Bell size={18} className="mr-2 text-blue-500" />
                  Recent Doorbell Rings
                </h3>
                
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground">No recent doorbell rings</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">{notification.visitor_name}</TableCell>
                          <TableCell>{notification.visitor_message || 'No message'}</TableCell>
                          <TableCell>{new Date(notification.created_at).toLocaleString()}</TableCell>
                          <TableCell>{notification.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              
              {/* Doorbells management */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Link size={18} className="mr-2 text-blue-500" />
                  Discord Webhook Configuration
                </h3>
                
                {doorbells.length === 0 ? (
                  <Alert>
                    <AlertTitle>No doorbells found</AlertTitle>
                    <AlertDescription>
                      You don't have any doorbells set up yet. Please contact an administrator.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {doorbells.length > 1 && (
                      <div className="mb-4">
                        <Label>Select Doorbell</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {doorbells.map((doorbell) => {
                            // Find apartment info
                            const apartment = apartments.find(a => a.id === doorbell.apartment_id);
                            
                            return (
                              <Button
                                key={doorbell.id}
                                variant={selectedDoorbell?.id === doorbell.id ? "default" : "outline"}
                                className="justify-start"
                                onClick={() => handleSelectDoorbell(doorbell)}
                              >
                                <Home size={16} className="mr-2" />
                                {apartment ? `${apartment.building_name} - ${apartment.apartment_number}` : 'Unnamed Doorbell'}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <form onSubmit={handleWebhookSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="webhook">Discord Webhook URL</Label>
                        <Input
                          id="webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste your Discord webhook URL to receive doorbell notifications.
                          The webhook will be used to send messages when someone rings your doorbell.
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="flex items-center"
                      >
                        <Save size={16} className="mr-2" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </form>
                  </>
                )}
              </div>
              
              {/* Buildings & Apartments (Admin only) */}
              {user?.isAdmin && (
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Building size={18} className="mr-2 text-blue-500" />
                    Buildings & Apartments
                  </h3>
                  
                  {buildings.map((building) => {
                    const buildingApartments = apartments.filter(
                      apt => apt.building_id === building.id
                    );
                    
                    return (
                      <div key={building.id} className="mb-6">
                        <h4 className="font-medium text-md flex items-center">
                          <Building size={14} className="mr-1" />
                          {building.name}
                          {building.address && <span className="text-muted-foreground text-sm ml-2">({building.address})</span>}
                        </h4>
                        
                        <div className="mt-2">
                          <h5 className="text-sm text-muted-foreground mb-1">Apartments:</h5>
                          <ul className="space-y-1 ml-4">
                            {buildingApartments.length === 0 ? (
                              <li className="text-sm">No apartments found</li>
                            ) : (
                              buildingApartments.map(apt => (
                                <li key={apt.id} className="text-sm flex items-center">
                                  <Home size={12} className="mr-1" />
                                  {apt.apartment_number}
                                  {apt.resident_name && <span className="text-muted-foreground ml-1">({apt.resident_name})</span>}
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 mt-4">
                    <h5 className="font-medium mb-1">Coming Soon:</h5>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Add/edit buildings & apartments</li>
                      <li>User role management</li>
                      <li>Doorbell assignment</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
        <h4 className="font-medium mb-1">Coming Soon:</h4>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Multi-user management</li>
          <li>Multiple doorbells configuration</li>
          <li>Building/apartment management</li>
          <li>Custom notification settings</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;
