# Usage Examples

## Example 1: Adding a 2024 Outback Wheel

### Input Form:
```
Year: 2024
Make: Subaru
Model: Outback
Wheel Size: 18"
Offset: +48mm
Bolt Pattern: 5x114.3
Condition: Excellent
Quantity: 4
Location: Warehouse A, Shelf 2
Notes: OEM wheels from trade-in, near mint condition
```

### Generated Output:
```
SKU: SUB-24-OUTB-18-E-472
QR Code: [Generated automatically]
Created: 2024-11-22 14:30:00
```

### Label Preview:
```
┌─────────────────────┐
│  SUB-24-OUTB-18-E-472  │
│                      │
│ 2024 Subaru Outback │
│ 18" | 5x114.3       │
│ Offset: +48mm       │
│ Excellent           │
│ Loc: Warehouse A,   │
│      Shelf 2        │
│                      │
│   [QR CODE IMAGE]   │
│                      │
└─────────────────────┘
```

---

## Example 2: Search Scenarios

### Search by Year:
```
Search: "2023"
Results:
- 2023 Forester wheels
- 2023 Crosstrek wheels
- 2023 Outback wheels
```

### Search by Model:
```
Search: "WRX"
Results:
- All WRX wheels across all years
```

### Search by Location:
```
Search: "Warehouse A"
Results:
- All wheels stored in Warehouse A
```

### Search by SKU:
```
Search: "SUB-24-OUTB"
Results:
- All 2024 Outback wheels
```

---

## Example 3: Typical Daily Workflow

### Morning: Receiving Wheels
1. Fleet vehicle returned with OEM wheels
2. Inspect wheels → Condition: Good
3. Add to system:
   - 2022 Forester, 17", Good condition, Qty: 4
4. System generates SKU: SUB-22-FORE-17-G-891
5. Print 4 labels (one per wheel)
6. Affix labels to wheels
7. Store in designated location

### Afternoon: Customer Inquiry
1. Customer calls asking for 2023 Crosstrek wheels
2. Search system: "2023 Crosstrek"
3. Find available inventory
4. Check location
5. Retrieve wheels
6. Scan QR code to verify
7. Mark as sold or update quantity

### End of Day: Inventory Check
1. Search by location: "Warehouse B"
2. Verify physical count matches system
3. Add any missing wheels
4. Update notes for any damaged items

---

## Example 4: API Usage Examples

### Get All Wheels
```bash
curl http://localhost:5000/api/wheels
```

Response:
```json
[
  {
    "id": 1,
    "sku": "SUB-24-OUTB-18-E-472",
    "year": 2024,
    "make": "Subaru",
    "model": "Outback",
    "wheel_size": "18\"",
    "offset": "+48mm",
    "bolt_pattern": "5x114.3",
    "condition": "Excellent",
    "quantity": 4,
    "location": "Warehouse A, Shelf 2",
    "notes": "OEM wheels from trade-in, near mint condition",
    "qr_code": "data:image/png;base64,...",
    "created_at": "2024-11-22T14:30:00.000Z",
    "updated_at": "2024-11-22T14:30:00.000Z"
  }
]
```

### Add New Wheel
```bash
curl -X POST http://localhost:5000/api/wheels \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2023,
    "make": "Subaru",
    "model": "Crosstrek",
    "wheel_size": "17\"",
    "offset": "+55mm",
    "bolt_pattern": "5x114.3",
    "condition": "Good",
    "quantity": 4,
    "location": "Warehouse B, Shelf 5"
  }'
```

### Search Wheels
```bash
curl http://localhost:5000/api/wheels/search/2023
```

### Delete Wheel
```bash
curl -X DELETE http://localhost:5000/api/wheels/1
```

---

## Example 5: Label Printing Workflow

### Scenario: Printing Labels for 4 Wheels

1. **Add wheel set to inventory**
   - Enter details for all 4 wheels (or qty: 4)
   - System generates SKU

2. **Generate label**
   - Click "Label" button
   - Preview appears

3. **Print 4 copies**
   - Click "Print"
   - In print dialog, set copies to 4
   - Print to label printer

4. **Alternative: Save and batch print**
   - Click "Save"
   - Downloads: label-SUB-24-OUTB-18-E-472.png
   - Open in image editor
   - Print 4 copies

5. **Apply labels**
   - Affix one label to each wheel
   - QR code faces outward for easy scanning

---

## Example 6: Managing Different Conditions

### Excellent Condition Set
```
Year: 2025
Model: Ascent
Size: 20"
Condition: Excellent
Quantity: 4
Notes: Brand new takeoffs, less than 100 miles
Location: Premium Storage
```
SKU: `SUB-25-ASCE-20-E-123`

### Fair Condition Set
```
Year: 2020
Model: Legacy
Size: 17"
Condition: Fair
Quantity: 3
Notes: Minor curb rash on one wheel, one wheel missing
Location: Budget Section
```
SKU: `SUB-20-LEGA-17-F-456`

---

## Example 7: Bulk Operations

### Adding Multiple Sets in One Session

**Set 1:**
- 2023 Forester, 17", Excellent, Qty: 4

**Set 2:**
- 2023 Forester, 17", Good, Qty: 4

**Set 3:**
- 2022 Outback, 18", Excellent, Qty: 4

Result: 3 different SKUs, each representing a unique set with different conditions or years.

---

## Example 8: QR Code Scanning

### With Mobile Device:
1. Customer scans QR code with phone camera
2. Phone reads SKU text
3. Customer can verify wheel details

### With Scanner App:
1. Use dedicated QR scanner
2. Scanner reads: SUB-24-OUTB-18-E-472
3. Look up SKU in system
4. Pull up complete wheel details

---

## Example 9: Inventory Reports

### Count by Model
```sql
SELECT model, COUNT(*) as total, SUM(quantity) as wheels
FROM wheels
GROUP BY model
ORDER BY total DESC;
```

Result:
```
Model      | Total Sets | Total Wheels
-----------|------------|-------------
Outback    | 12         | 48
Forester   | 10         | 40
Crosstrek  | 8          | 32
WRX        | 5          | 20
```

### Count by Condition
```sql
SELECT condition, COUNT(*) as sets, SUM(quantity) as wheels
FROM wheels
GROUP BY condition;
```

Result:
```
Condition  | Sets | Wheels
-----------|------|-------
Excellent  | 15   | 60
Good       | 12   | 48
Fair       | 5    | 20
```

---

## Example 10: Real-World Scenario

### Complete Transaction Flow

**Monday Morning: Receiving**
```
Vehicle: 2024 Subaru Outback Limited
Wheels: 18" OEM with TPMS
Condition: Excellent (500 miles)

Actions:
1. Inspect wheels ✓
2. Add to system:
   - Year: 2024, Model: Outback, Size: 18"
   - Condition: Excellent, Qty: 4
   - Location: Warehouse A, Row 3, Shelf 2
   - Notes: TPMS included, original owner
3. Generate SKU: SUB-24-OUTB-18-E-891
4. Print 4 labels
5. Apply labels and store
```

**Wednesday Afternoon: Sale**
```
Customer Request: 2024 Outback wheels

Actions:
1. Search: "2024 Outback"
2. Found: SUB-24-OUTB-18-E-891
3. Verify location: Warehouse A, Row 3, Shelf 2
4. Retrieve wheels
5. Scan QR code to confirm
6. Verify TPMS in notes
7. Update system: Change qty to 0 or delete
```

**Friday: Inventory Audit**
```
Actions:
1. Search: "Warehouse A"
2. Print report of all items
3. Physical count verification
4. Reconcile discrepancies
5. Update notes for any issues
```

---

## Tips & Best Practices

### 1. Consistent Naming
- Always use full model names
- Standardize location names
- Use consistent offset format (+48mm, not 48 or +48)

### 2. Quality Notes
- Include TPMS status
- Note any damage
- Record previous vehicle details
- Add special features

### 3. Organization
- Create location zones (A, B, C)
- Use shelves and rows
- Keep similar wheels together
- Reserve premium spots for excellent condition

### 4. Label Placement
- Place on wheel face, not rim edge
- Ensure QR code is easily scannable
- Consider laminating labels for durability
- Replace damaged labels immediately

### 5. Regular Maintenance
- Weekly inventory spot checks
- Monthly full audits
- Update conditions as wheels age
- Remove sold items promptly
