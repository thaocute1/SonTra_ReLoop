class HealthProfile {
  const HealthProfile(this.values);
  final Map<String, dynamic> values;
  static const fields = [
    'date_of_birth',
    'height_cm',
    'weight_kg',
    'fitness_level',
    'medical_notes',
    'emergency_contact_name',
    'emergency_contact_phone'
  ];
  Map<String, dynamic> toJson() => {
        for (final field in fields) field: values[field],
      };
}
