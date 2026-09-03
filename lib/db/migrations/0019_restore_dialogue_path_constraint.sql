ALTER TABLE "account_blueprint_clearance"
  DROP CONSTRAINT IF EXISTS "account_blueprint_clearance_threshold_dialogue_path_check";

ALTER TABLE "account_blueprint_clearance"
  ADD CONSTRAINT "account_blueprint_clearance_threshold_dialogue_path_check"
  CHECK (
    cardinality("threshold_dialogue_path") <= 16
    AND "threshold_dialogue_path" <@ ARRAY[
      'kinship-want',
      'kinship-fear',
      'kinship-familiar',
      'kinship-with-you',
      'kinship-help',
      'kinship-grow',
      'inquiry-answer',
      'inquiry-warning',
      'inquiry-relation',
      'inquiry-unsayable',
      'inquiry-warning-against',
      'inquiry-preserve',
      'inquiry-risk',
      'inquiry-pattern',
      'dominion-decide',
      'dominion-cipher',
      'dominion-stand',
      'dominion-stop',
      'kinship-universe',
      'kinship-difference',
      'kinship-stop-why',
      'kinship-unafraid',
      'kinship-fear-change',
      'kinship-guide',
      'kinship-familiar-how',
      'kinship-light-why',
      'inquiry-demand-answer',
      'inquiry-demand-unsayable',
      'inquiry-meaning',
      'inquiry-warning-against-truth',
      'inquiry-preservation',
      'inquiry-sight',
      'inquiry-relation-pattern',
      'dominion-decision',
      'dominion-recognize',
      'dominion-cipher-authority',
      'dominion-refusal-authority',
      'dominion-choice-why',
      'dominion-choice-fear',
      'dominion-choice-enough',
      'dominion-command',
      'dominion-final-answer'
    ]::text[]
  ) NOT VALID;
