"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/store/store-context";
import { observer } from "mobx-react-lite";

export default observer(function RegisterForm() {
  const { nguageStore } = useStore();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    businessAddress: "",
    industry: "",
    gstNumber: "",
    documents: null as FileList | null,
    uploadedFileName: "" as string,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      setFormData((prev) => ({
        ...prev,
        documents: e.target.files,
      }));

      // Call API to upload file immediately
      setIsUploading(true);
      setSubmitMessage(null);
      
      try {
        console.log("Uploading file:", file.name);
        const uploadResult = await nguageStore.UploadAttachFile(file, file.name);
        console.log("Upload result:", uploadResult);
        
        if (uploadResult) {
          setFormData((prev) => ({
            ...prev,
            uploadedFileName: file.name,
          }));
          setSubmitMessage({ type: "success", text: `File "${file.name}" uploaded successfully!` });
        } else {
          setSubmitMessage({ type: "error", text: "File upload failed" });
        }
      } catch (error) {
        console.error("Upload error:", error);
        setSubmitMessage({ type: "error", text: "An error occurred while uploading the file" });
      } finally {
        setIsUploading(false);
      }
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
      const result = await nguageStore.AddDataSourceRow({
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
        "is_account_created": "false"
      });

      if (result.result) {
        setSubmitMessage({ type: "success", text: "Registration submitted successfully!" });
        // Reset form
        setFormData({
          companyName: "",
          businessAddress: "",
          industry: "",
          gstNumber: "",
          documents: null,
          uploadedFileName: "",
          contactFirstName: "",
          contactLastName: "",
          jobTitle: "",
          businessEmail: "",
          phoneNumber: "",
        });
        setIsChecked(false);
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
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-4xl mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Register
            </h1>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Company Identification Section */}
                <div>
                  <h2 className="mb-4 font-semibold text-gray-800 text-base dark:text-white/90">
                    Company Identification
                  </h2>
                  <div className="space-y-5">
                    {/* Legal Company Name */}
                    <div className="mb-5">
                      <Label>
                        Legal Company Name<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="companyName"
                        placeholder="Enter your legal company name"
                        defaultValue={formData.companyName}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Primary Business Address */}
                    <div className="mb-5">
                      <Label>
                        Primary Business Address<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="businessAddress"
                        placeholder="Enter your primary business address"
                        defaultValue={formData.businessAddress}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Primary Industry/Business Sector */}
                    <div className="mb-5">
                      <Label>
                        Primary Industry/Business Sector<span className="text-error-500">*</span>
                      </Label>
                      <Select
                        placeholder="Select an industry"
                        options={industries}
                        defaultValue={formData.industry}
                        onChange={handleSelectChange("industry")}
                      />
                    </div>

                    {/* GST Number */}
                    <div className="mb-5">
                      <Label>
                        GST Number<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="gstNumber"
                        placeholder="Enter your GST number"
                        defaultValue={formData.gstNumber}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Documents */}
                    <div className="mb-5">
                      <Label>
                        Documents (Attachments)<span className="text-error-500">*</span>
                      </Label>
                      <input
                        type="file"
                        name="documents"
                        multiple
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-500 file:text-white hover:file:bg-brand-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Contact Person Section */}
                <div>
                  <h2 className="mb-4 font-semibold text-gray-800 text-base dark:text-white/90">
                    Primary Contact Person
                  </h2>
                  <div className="space-y-5">
                    {/* First Name & Last Name */}
                    <div>
                      <Label>
                        First Name<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="contactFirstName"
                        placeholder="Enter first name"
                        defaultValue={formData.contactFirstName}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <Label>
                        Last Name<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="contactLastName"
                        placeholder="Enter last name"
                        defaultValue={formData.contactLastName}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Job Title */}
                    <div className="mb-5">
                      <Label>
                        Job Title<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="jobTitle"
                        placeholder="Enter job title"
                        defaultValue={formData.jobTitle}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Business Email Address */}
                    <div className="mb-5">
                      <Label>
                        Business Email Address<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="email"
                        name="businessEmail"
                        placeholder="Enter your business email (will be used as login ID)"
                        defaultValue={formData.businessEmail}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="mb-5">
                      <Label>
                        Phone Number<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="tel"
                        name="phoneNumber"
                        placeholder="Enter phone number"
                        defaultValue={formData.phoneNumber}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-center gap-3 my-3">
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

              {/* Submit Message */}
              {submitMessage && (
                <div
                  className={`mb-4 p-4 rounded-lg ${submitMessage.type === "success"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                    }`}
                >
                  {submitMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 items-center">
                <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                  Already have an account?
                  <Link
                    href="/login"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Login
                  </Link>
                </p>
                {/* Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Registering..." : "Register"}
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
