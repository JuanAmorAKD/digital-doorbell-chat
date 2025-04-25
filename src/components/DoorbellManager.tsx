
import React, { useState } from 'react';
import { QrCode, Bell, Plus, Toggle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode.react';

interface Doorbell {
  id: string;
  name: string;
  webhook_url: string | null;
  enabled: boolean;
  qr_code_enabled: boolean;
}

interface DoorbellManagerProps {
  doorbells: Doorbell[];
  onUpdate: () => void;
}

const DoorbellManager: React.FC<DoorbellManagerProps> = ({ doorbells, onUpdate }) => {
  const { toast } = useToast();
  const [newDoorbell, setNewDoorbell] = useState({ name: '', webhook_url: '' });
  const [showQR, setShowQR] = useState<string | null>(null);

  const handleCreateDoorbell = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('doorbells')
        .insert({
          name: newDoorbell.name,
          webhook_url: newDoorbell.webhook_url || null,
          enabled: true,
          qr_code_enabled: true,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Timbre creado",
        description: "El nuevo timbre ha sido creado exitosamente.",
      });
      
      setNewDoorbell({ name: '', webhook_url: '' });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear el timbre.",
        variant: "destructive",
      });
    }
  };

  const handleToggleDoorbell = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('doorbells')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: enabled ? "Timbre activado" : "Timbre desactivado",
        description: `El timbre ha sido ${enabled ? 'activado' : 'desactivado'} exitosamente.`,
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del timbre.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDoorbell = async (id: string, data: Partial<Doorbell>) => {
    try {
      const { error } = await supabase
        .from('doorbells')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Timbre actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el timbre.",
        variant: "destructive",
      });
    }
  };

  const getDoorbellUrl = (id: string) => {
    return `${window.location.origin}?doorbell=${id}`;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreateDoorbell} className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-medium">Crear Nuevo Timbre</h4>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="doorbell-name">Nombre del Timbre</Label>
            <Input
              id="doorbell-name"
              value={newDoorbell.name}
              onChange={(e) => setNewDoorbell(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Timbre Principal"
              required
            />
          </div>
          <div>
            <Label htmlFor="webhook-url">Webhook de Discord (Opcional)</Label>
            <Input
              id="webhook-url"
              type="password"
              value={newDoorbell.webhook_url}
              onChange={(e) => setNewDoorbell(prev => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Crear Timbre
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        <h4 className="font-medium">Mis Timbres</h4>
        {doorbells.map((doorbell) => (
          <div key={doorbell.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Input
                  value={doorbell.name}
                  onChange={(e) => handleUpdateDoorbell(doorbell.id, { name: e.target.value })}
                  className="font-medium"
                />
                <p className="text-sm text-muted-foreground">
                  {doorbell.enabled ? 'Activo' : 'Desactivado'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQR(showQR === doorbell.id ? null : doorbell.id)}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Switch
                  checked={doorbell.enabled}
                  onCheckedChange={(checked) => handleToggleDoorbell(doorbell.id, checked)}
                />
              </div>
            </div>

            {showQR === doorbell.id && (
              <div className="mt-4 p-4 bg-white rounded-lg flex flex-col items-center gap-4">
                <QRCode value={getDoorbellUrl(doorbell.id)} size={200} />
                <p className="text-sm text-center text-muted-foreground break-all">
                  {getDoorbellUrl(doorbell.id)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={`webhook-${doorbell.id}`}>Webhook de Discord</Label>
              <Input
                id={`webhook-${doorbell.id}`}
                type="password"
                value={doorbell.webhook_url || ''}
                onChange={(e) => handleUpdateDoorbell(doorbell.id, { webhook_url: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoorbellManager;
