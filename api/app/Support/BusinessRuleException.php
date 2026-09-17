<?php

namespace App\Support;

use Exception;

/**
 * A rejection the user can act on.
 *
 * Carries a stable machine code and an operator-safe message. The handler turns
 * it into the standard envelope; the UI turns it into an ExceptionPanel that
 * states what happened, why, and what to do next (docs/25 §5). Never used for
 * internal failures — those become a generic 500 with a trace id.
 */
class BusinessRuleException extends Exception
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 422,
        public readonly array $details = [],
    ) {
        parent::__construct($message);
    }

    public static function invalidZoneForFacility(): self
    {
        return new self(
            'ZONE_FACILITY_MISMATCH',
            'The selected zone does not belong to the selected facility.',
            422,
        );
    }

    public static function inactiveParent(string $parent): self
    {
        return new self(
            'PARENT_INACTIVE',
            "The selected {$parent} is inactive. Reactivate it before adding records to it.",
            422,
            ['parent' => $parent],
        );
    }

    public static function duplicateCode(string $entity, string $code, string $scope): self
    {
        return new self(
            'DUPLICATE_CODE',
            ucfirst($entity)." code \"{$code}\" is already in use within this {$scope}.",
            409,
            ['code' => $code, 'scope' => $scope],
        );
    }

    public static function inUse(string $entity, string $blockedBy, int $count): self
    {
        return new self(
            'RECORD_IN_USE',
            "This {$entity} cannot be deleted because {$count} {$blockedBy} reference it.",
            409,
            ['blocked_by' => $blockedBy, 'count' => $count],
        );
    }

    public static function outOfScope(): self
    {
        return new self(
            'FACILITY_OUT_OF_SCOPE',
            'This record is outside the facilities assigned to your account.',
            403,
        );
    }
}
