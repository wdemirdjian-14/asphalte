import { Field, Input } from "@/components/ui";

/**
 * Bloc de saisie d'un véhicule, répété dans le formulaire de création
 * d'un client. Les champs portent tous le même nom : l'action serveur les
 * apparie par position et ignore les blocs sans immatriculation.
 */
export function VehicleFieldset({ index }: { index: number }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-1 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
        Véhicule {index}
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Immatriculation">
          <Input
            name="vehiclePlate"
            placeholder="AB-123-CD"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Marque">
          <Input name="vehicleBrand" placeholder="Yamaha" />
        </Field>
        <Field label="Modèle">
          <Input name="vehicleModel" placeholder="MT-07" />
        </Field>
        <Field label="Année">
          <Input
            name="vehicleYear"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
          />
        </Field>
        <Field label="Cylindrée (cm³)">
          <Input name="vehicleDisplacement" type="number" inputMode="numeric" min={0} />
        </Field>
        <Field label="Kilométrage">
          <Input name="vehicleMileage" type="number" inputMode="numeric" min={0} />
        </Field>
      </div>
    </fieldset>
  );
}
