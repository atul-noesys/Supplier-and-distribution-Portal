"use client";
import Checkbox from "@/components/form/input/Checkbox";
import { Select, TextInput } from "@/components/ui";
import MultiFileInput from '@/components/ui/infoveave-components/MultiFileInput';
import { cn } from "@/lib/utils";
import { useStore } from "@/store/store-context";
import { observer } from "mobx-react-lite";
import Link from "next/link";
import { useState } from "react";

export default observer(function RegisterForm() {
  const { nguageStore } = useStore();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSupplier, setIsSupplier] = useState(true);
  const [formData, setFormData] = useState({
    companyName: "",
    businessAddress: "",
    industry: "",
    gstNumber: "",
    uploadedFileName: "" as string,
    documents: [] as File[],
    contactFirstName: "",
    contactLastName: "",
    jobTitle: "",
    businessEmail: "",
    phoneNumber: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const industries = [
    { value: "", label: "Select an industry" },
    { value: "raw-materials", label: "Raw Materials" },
    { value: "sub-contractors", label: "Sub Contractors" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "logistics", label: "Logistics & Distribution" },
    { value: "wholesale", label: "Wholesale" },
    { value: "services", label: "Services" },
    { value: "other", label: "Other" },
  ];

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleValueChange = (name: string) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = async (files: any[] | undefined) => {
    if (!files || files.length === 0) return;

    // Normalize incoming values to File objects (some components pass { file } wrappers)
    const filesToUpload: File[] = files
      .map((fileItem: any) => (fileItem?.file ? fileItem.file : fileItem))
      .filter((file: File) => file && file.name);

    if (filesToUpload.length === 0) {
      setSubmitMessage({ type: "error", text: "No valid files selected" });
      return;
    }

    setFormData((prev) => ({ ...prev, documents: filesToUpload }));
    setIsUploading(true);
    setSubmitMessage(null);

    try {
      const uploadResult = await nguageStore.UploadMultipleMedia(filesToUpload);
      console.log("Upload result:", uploadResult);

      if (uploadResult) {
        setFormData((prev) => ({
          ...prev,
          uploadedFileName: JSON.stringify(Array.isArray(uploadResult) ? uploadResult : [uploadResult]),
        }));
      } else {
        setSubmitMessage({ type: "error", text: "File upload failed" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setSubmitMessage({ type: "error", text: "An error occurred while uploading the file" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isChecked) {
      setSubmitMessage({ type: "error", text: "Please agree to Terms and Conditions" });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const result = await nguageStore.RegisterSupplier({
        "company_name": formData.companyName,
        "business_address": formData.businessAddress,
        "industry": formData.industry,
        "gst_number": formData.gstNumber,
        "documents": formData.uploadedFileName,
        "first_name": formData.contactFirstName,
        "last_name": formData.contactLastName,
        "job_title": formData.jobTitle,
        "business_email": formData.businessEmail,
        "phone_number": formData.phoneNumber,
        "approved": 0,
        "user_registration_date": new Date().toISOString().split('T')[0],
        "is_account_created": "false",
        "supplier_type": "0",
      });

      if (result.result !== null) {
        setSubmitMessage({ type: "success", text: "Registration submitted successfully!" });
        // Reset form
        setFormData({
          companyName: "",
          businessAddress: "",
          industry: "",
          gstNumber: "",
          uploadedFileName: "",
          documents: [],
          contactFirstName: "",
          contactLastName: "",
          jobTitle: "",
          businessEmail: "",
          phoneNumber: "",
        });
        setIsChecked(false);
        setIsSuccess(true);
      } else {
        setSubmitMessage({ type: "error", text: result.error || "Failed to submit registration" });
      }
    } catch (error) {
      setSubmitMessage({ type: "error", text: "An error occurred while submitting the form" });
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setFormData({
      companyName: "",
      businessAddress: "",
      industry: "",
      gstNumber: "",
      uploadedFileName: "",
      documents: [],
      contactFirstName: "",
      contactLastName: "",
      jobTitle: "",
      businessEmail: "",
      phoneNumber: "",
    });
    setIsChecked(false);
    setSubmitMessage(null);
  };

  // Success Page
  if (isSuccess) {
    return (
      <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar relative">

        <div className="flex flex-col justify-center flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
                <svg className="w-8 h-8 text-green-600 dark:text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <h1 className="mb-3 text-2xl font-semibold text-gray-800 dark:text-white sm:text-3xl">
              Registration Successful!
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-400 text-lg">
              Thank you for registering with us. Your application has been submitted successfully.
            </p>

            {/* Details Box */}
            <div className="p-6 mb-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <p className="text-center text-gray-700 dark:text-gray-300 text-base font-medium">
                Your credentials are sent on the registered email address with password
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={resetForm}
                className="px-6 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
              >
                Register Another Company
              </button>
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-medium text-brand-600 dark:text-brand-400 transition rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar relative">

      <div className="flex flex-col justify-center flex-1 w-full max-w-4xl mx-auto relative z-10">
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className={`font-semibold text-title-sm sm:text-title-md transition-colors ${isSupplier ? 'text-brand-700' : 'text-green-600'} dark:text-white/90`}>
              {isSupplier ? 'Supplier' : 'Buyer'} Registration
            </h2>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setIsSupplier(!isSupplier)}
              className={`relative inline-flex h-6 w-32 px-0.5 items-center rounded-full transition-colors ${
                isSupplier 
                  ? 'bg-brand-600 dark:bg-brand-600' 
                  : 'bg-green-600 dark:bg-green-600'
              }`}
            >
              {/* Slider */}
              <span
                className={`inline-block h-5 w-1/2 transform rounded-full bg-white transition-transform ${
                  isSupplier ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              
              {/* Labels inside */}
              <span className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold pointer-events-none">
                <span className={`${isSupplier ? 'text-brand-600' : 'text-white'}`}>Supplier</span>
                <span className={`${isSupplier ? 'text-white' : 'text-green-600'}`}>Buyer</span>
              </span>
            </button>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-sm p-6 border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Company Identification Section */}
                <div>
                  <h2 className={cn("mb-4 font-semibold text-gray-800 text-base dark:text-white/90 pb-3 border-b-2 border-brand-500/20", isSupplier ? "border-brand-500/20" : "border-green-600/20")}>
                    Company Identification
                  </h2>
                  <div className="space-y-5">
                    {/* Legal Company Name */}
                    <div className="mb-5">
                      <TextInput
                        label={<>Legal Company Name<span className="text-error-500">*</span></>}
                        type="text"
                        value={String(formData.companyName ?? '')}
                        placeholder="Enter your legal company name"
                        onValueChange={(v) => handleValueChange('companyName')(v)}
                      />
                    </div>

                    {/* Primary Business Address */}
                    <div className="mb-5">
                      <TextInput
                        label={<>Primary Business Address<span className="text-error-500">*</span></>}
                        type="text"
                        value={String(formData.businessAddress ?? '')}
                        placeholder="Enter your primary business address"
                        onValueChange={(v) => handleValueChange('businessAddress')(v)}
                      />
                    </div>

                    {/* Primary Industry/Business Sector */}
                    <div className="mb-5">
                      <Select
                        label={<>Primary Industry/Business Sector<span className="text-error-500">*</span></>}
                        placeholder="Select an industry"
                        data={industries}
                        value={String(formData.industry ?? '')}
                        onChange={(v) => handleSelectChange('industry')(v ?? '')}
                      />
                    </div>

                    {/* GST Number */}
                    <div className="mb-5">
                      <TextInput
                        label={<>GST Number<span className="text-error-500">*</span></>}
                        type="text"
                        value={String(formData.gstNumber ?? '')}
                        placeholder="Enter your GST number"
                        onValueChange={(v) => handleValueChange('gstNumber')(v)}
                      />
                    </div>

                    {/* Documents */}
                    <div className="mb-5">
                      <MultiFileInput
                        label={<>Documents (Attachments)<span className="text-error-500">*</span></>}
                        maxFiles={5}
                        accept=".pdf,.png,.jpg,.jpeg"
                        multiple={true}
                        className="w-full"
                        onValueChange={handleFileChange}
                      />
                      {isUploading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                          <span>Uploading file...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Contact Person Section */}
                <div>
                  <h2 className={cn("mb-4 font-semibold text-gray-800 text-base dark:text-white/90 pb-3 border-b-2 border-brand-500/20", isSupplier ? "border-brand-500/20" : "border-green-600/20")}>
                    Primary Contact Person
                  </h2>
                  <div className="space-y-5">
                    {/* First Name & Last Name */}
                    <div>
                      <TextInput
                        label={<>First Name<span className="text-error-500">*</span></>}
                        type="text"
                        value={String(formData.contactFirstName ?? '')}
                        placeholder="Enter first name"
                        onValueChange={(v) => handleValueChange('contactFirstName')(v)}
                      />
                    </div>
                    <div>
                      <TextInput
                        label={<>Last Name<span className="text-error-500">*</span></>}
                        type="text"
                        value={String(formData.contactLastName ?? '')}
                        placeholder="Enter last name"
                        onValueChange={(v) => handleValueChange('contactLastName')(v)}
                      />
                    </div>

                    {/* Job Title */}
                    <div className="mb-5">
                      <TextInput
                        label={<>Job Title<span className="text-error-500">*</span></>}
                        type="text"
                        value={String(formData.jobTitle ?? '')}
                        placeholder="Enter job title"
                        onValueChange={(v) => handleValueChange('jobTitle')(v)}
                      />
                    </div>

                    {/* Business Email Address */}
                    <div className="mb-5">
                      <TextInput
                        label={<>Business Email Address<span className="text-error-500">*</span></>}
                        type="email"
                        value={String(formData.businessEmail ?? '')}
                        placeholder="Enter your business email (will be used as login ID)"
                        onValueChange={(v) => handleValueChange('businessEmail')(v)}
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="mb-5">
                      <TextInput
                        label={<>Phone Number<span className="text-error-500">*</span></>}
                        type="tel"
                        value={String(formData.phoneNumber ?? '')}
                        placeholder="Enter phone number"
                        onValueChange={(v) => handleValueChange('phoneNumber')(v)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox - Inside Card */}
              <div className="flex items-center gap-3">
                <Checkbox
                  className="w-5 h-5"
                  checked={isChecked}
                  onChange={setIsChecked}
                />
                <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                  By creating an account means you agree to the{" "}
                  <span className="text-gray-800 dark:text-white/90">
                    Terms and Conditions,
                  </span>{" "}
                  and our{" "}
                  <span className="text-gray-800 dark:text-white">
                    Privacy Policy
                  </span>
                </p>
              </div>
            </div>

              {/* Submit Message */}
              {submitMessage && (
                <div
                  className={`mb-4 px-4 py-1 rounded-lg font-medium transition-all ${submitMessage.type === "success"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200 border border-green-300 dark:border-green-700"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200 border border-red-300 dark:border-red-700"
                    }`}
                >
                  {submitMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 items-center mt-5">
                <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                  Already have an account?
                  <Link
                    href="/login"
                    className={cn("ml-1 dark:text-brand-400 font-semibold hover:underline", isSupplier ? "text-brand-500 hover:text-brand-600" : "text-green-500 hover:text-green-600")}
                  >
                    Login
                  </Link>
                </p>
                {/* Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn("flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg shadow-theme-xs active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed", isSupplier ? "bg-brand-600 hover:bg-brand-500" : "bg-green-600 hover:bg-green-500")}
                  >
                    {isSubmitting ? "Registering..." : isSupplier ? "Register Supplier" : "Register Buyer"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});
