<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DispatchTransactionDetail extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'inventory_transaction_id', 'delivery_reference', 'vehicle_reference',
        'dispatched_from_location_id', 'customer_id', 'lpo_number', 'remarks',
    ];
}
