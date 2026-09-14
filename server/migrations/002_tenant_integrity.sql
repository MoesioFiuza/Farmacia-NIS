ALTER TABLE users ADD CONSTRAINT users_tenant_id_id_unique UNIQUE (tenant_id, id);
ALTER TABLE patients ADD CONSTRAINT patients_tenant_id_id_unique UNIQUE (tenant_id, id);
ALTER TABLE medications ADD CONSTRAINT medications_tenant_id_id_unique UNIQUE (tenant_id, id);

ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_user_tenant_fk
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id);
ALTER TABLE consultations ADD CONSTRAINT consultations_patient_tenant_fk
  FOREIGN KEY (tenant_id, patient_id) REFERENCES patients (tenant_id, id);
ALTER TABLE consultations ADD CONSTRAINT consultations_pharmacist_tenant_fk
  FOREIGN KEY (tenant_id, pharmacist_id) REFERENCES users (tenant_id, id);
ALTER TABLE medications ADD CONSTRAINT medications_patient_tenant_fk
  FOREIGN KEY (tenant_id, patient_id) REFERENCES patients (tenant_id, id);
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_tenant_fk
  FOREIGN KEY (tenant_id, patient_id) REFERENCES patients (tenant_id, id);
ALTER TABLE appointments ADD CONSTRAINT appointments_user_tenant_fk
  FOREIGN KEY (tenant_id, assigned_user_id) REFERENCES users (tenant_id, id);
ALTER TABLE adherence ADD CONSTRAINT adherence_patient_tenant_fk
  FOREIGN KEY (tenant_id, patient_id) REFERENCES patients (tenant_id, id);
ALTER TABLE adherence ADD CONSTRAINT adherence_medication_tenant_fk
  FOREIGN KEY (tenant_id, medication_id) REFERENCES medications (tenant_id, id);
