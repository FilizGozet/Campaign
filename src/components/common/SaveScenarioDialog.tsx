import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "./Field";

export function SaveScenarioDialog({
  open,
  onOpenChange,
  defaultName,
  onSave,
  title = "Senaryoyu kaydet",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultName: string;
  onSave: (name: string, note: string) => void;
  title?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setNote("");
      setTouched(false);
    }
  }, [open, defaultName]);
  const error = touched && !name.trim() ? "Senaryo adı zorunludur." : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Senaryo, girdileri ve hesaplanan sonuçlarıyla birlikte bu tarayıcıda saklanır. Aynı girdiler her zaman aynı sonucu üretir.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!name.trim()) return;
            onSave(name.trim(), note.trim());
            onOpenChange(false);
          }}
        >
          <Field label="Senaryo adı" htmlFor="scn-name" error={error}>
            <Input id="scn-name" autoFocus value={name} maxLength={80} invalid={!!error} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
          </Field>
          <Field label="Not (isteğe bağlı)" htmlFor="scn-note">
            <Textarea id="scn-note" value={note} maxLength={240} placeholder="Örn. Finans ekibinin önerdiği bütçe ile" onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
            <Button type="submit">Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
