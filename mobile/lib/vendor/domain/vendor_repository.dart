typedef VendorRecord = Map<String, dynamic>;

abstract class VendorRepository {
  Future<dynamic> request(String path,
      {String method = 'GET', VendorRecord? body, Map<String, String>? query});
  void close();
}

VendorRecord vendorRecord(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

List<VendorRecord> vendorRecords(dynamic value) => value is List
    ? value.whereType<Map>().map((v) => Map<String, dynamic>.from(v)).toList()
    : <VendorRecord>[];
