import { Field, Input, Textarea } from "@/components/ui";
import type { Client } from "@prisma/client";

export function ClientFormFields({ client }: { client?: Client }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Prénom">
        <Input name="firstName" required defaultValue={client?.firstName ?? ""} />
      </Field>
      <Field label="Nom">
        <Input name="lastName" required defaultValue={client?.lastName ?? ""} />
      </Field>
      <Field label="Téléphone">
        <Input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          defaultValue={client?.phone ?? ""}
        />
      </Field>
      <Field label="Téléphone secondaire">
        <Input name="phone2" type="tel" defaultValue={client?.phone2 ?? ""} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" defaultValue={client?.email ?? ""} />
      </Field>
      <Field label="Société">
        <Input name="company" defaultValue={client?.company ?? ""} />
      </Field>
      <Field label="Adresse" className="sm:col-span-2">
        <Input name="address" defaultValue={client?.address ?? ""} />
      </Field>
      <Field label="Code postal">
        <Input name="postalCode" defaultValue={client?.postalCode ?? ""} />
      </Field>
      <Field label="Ville">
        <Input name="city" defaultValue={client?.city ?? ""} />
      </Field>
      <Field label="Notes internes" className="sm:col-span-2">
        <Textarea name="notes" rows={3} defaultValue={client?.notes ?? ""} />
      </Field>
    </div>
  );
}
