/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type FundCreateFormInputValues = {};
export declare type FundCreateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type FundCreateFormOverridesProps = {
    FundCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type FundCreateFormProps = React.PropsWithChildren<{
    overrides?: FundCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: FundCreateFormInputValues) => FundCreateFormInputValues;
    onSuccess?: (fields: FundCreateFormInputValues) => void;
    onError?: (fields: FundCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: FundCreateFormInputValues) => FundCreateFormInputValues;
    onValidate?: FundCreateFormValidationValues;
} & React.CSSProperties>;
export default function FundCreateForm(props: FundCreateFormProps): React.ReactElement;
