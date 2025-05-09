
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Building, Plus, RefreshCw, Bell, Home, Save, Link } from 'lucide-react';
import DoorbellManager from './DoorbellManager';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  name: string;
  qr_code_enabled: boolean;
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
  
  useEffect(() => {
    fetchData();
    
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
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*');
      
      if (buildingsError) throw buildingsError;
      
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select(`
          *,
          buildings(name)
        `);
      
      if (apartmentsError) throw apartmentsError;
      
      const { data: doorbellsData, error: doorbellsError } = await supabase
        .from('doorbells')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (doorbellsError) throw doorbellsError;
      
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          *,
          doorbells(id, webhook_url)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (notificationsError) throw notificationsError;
      
      const apartmentsWithBuilding = apartmentsData.map((apt: any) => ({
        ...apt,
        building_name: apt.buildings?.name || 'Unknown Building'
      }));
      
      setBuildings(buildingsData);
      setApartments(apartmentsWithBuilding);
      setDoorbells(doorbellsData);
      setNotifications(notificationsData);
      
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
      
      setWebhookUrl(webhookUrl);
      
      toast({
        title: "Configuración guardada",
        description: "El webhook de Discord ha sido actualizado exitosamente.",
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error al guardar webhook:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la configuración",
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
  
  const handleInitialSetup = async () => {
    if (buildings.length > 0) return;
    
    setIsSaving(true);
    
    try {
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
      
      const { data: doorbell, error: doorbellError } = await supabase
        .from('doorbells')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          webhook_url: null,
          name: 'Main Doorbell',
          enabled: true,
          qr_code_enabled: true
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
          <h2 className="text-2xl font-semibold">Panel de Administración</h2>
          <p className="text-muted-foreground">
            Bienvenido, {user?.name}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} title="Actualizar datos">
            <RefreshCw size={16} className="mr-2" />
            Actualizar
          </Button>
          
          <Button variant="outline" onClick={logout}>
            <LogOut size={16} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Bell size={18} className="mr-2 text-blue-500" />
              Gestión de Timbres
            </h3>
            
            <DoorbellManager 
              doorbells={doorbells}
              onUpdate={fetchData}
            />
          </div>
          
          {buildings.length === 0 ? (
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Bienvenido a Digital Doorbell</h3>
              <p className="mb-4">No tienes ningún edificio o timbre configurado aún. Vamos a crear tu primer timbre.</p>
              
              <Button onClick={handleInitialSetup} disabled={isSaving}>
                <Plus size={16} className="mr-2" />
                {isSaving ? 'Configurando...' : 'Crear Mi Primer Timbre'}
              </Button>
            </div>
          ) : (
            <>
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
              
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Link size={18} className="mr-2 text-blue-500" />
                  Configuración del Webhook de Discord
                </h3>
                
                {doorbells.length === 0 ? (
                  <Alert>
                    <AlertTitle>No doorbells found</AlertTitle>
                    <AlertDescription>
                      No tienes ningún timbre configurado aún. Por favor, contacta a un administrador.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {doorbells.length > 1 && (
                      <div className="mb-4">
                        <Label>Select Doorbell</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {doorbells.map((doorbell) => {
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
                        <Label htmlFor="webhook">URL del Webhook de Discord</Label>
                        <Input
                          id="webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          type="password"
                          placeholder="https://discord.com/api/webhooks/..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Ingresa tu webhook de Discord para recibir notificaciones.
                          El webhook será almacenado de manera segura.
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="flex items-center"
                      >
                        <Save size={16} className="mr-2" />
                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                      </Button>
                    </form>
                  </>
                )}
              </div>
              
              {user?.isAdmin && (
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Building size={18} className="mr-2 text-blue-500" />
                    Edificios & Apartamentos
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
                          <h5 className="text-sm text-muted-foreground mb-1">Apartamentos:</h5>
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
                    <h5 className="font-medium mb-1">Próximamente:</h5>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Agregar/editar edificios & apartamentos</li>
                      <li>Gestión de roles de usuario</li>
                      <li>Asignación de timbres</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
        <h4 className="font-medium mb-1">Próximamente:</h4>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Gestión multi-usuarios</li>
          <li>Configuración de múltiples timbres</li>
          <li>Gestión de edificios/apartamentos</li>
          <li>Configuración de ajustes de notificación personalizados</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;
