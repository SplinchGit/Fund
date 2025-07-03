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
export declare type FundUpdateFormInputValues = {};
export declare type FundUpdateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type FundUpdateFormOverridesProps = {
    FundUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type FundUpdateFormProps = React.PropsWithChildren<{
    overrides?: FundUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    fund?: any;
    onSubmit?: (fields: FundUpdateFormInputValues) => FundUpdateFormInputValues;
    onSuccess?: (fields: FundUpdateFormInputValues) => void;
    onError?: (fields: FundUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: FundUpdateFormInputValues) => FundUpdateFormInputValues;
    onValidate?: FundUpdateFormValidationValues;
} & React.CSSProperties>;
export default function FundUpdateForm(props: FundUpdateFormProps): React.ReactElement;
