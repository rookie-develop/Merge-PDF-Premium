/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { 
  FileText, 
  Upload, 
  X, 
  Moon, 
  Sun, 
  GripVertical, 
  Trash2, 
  Download, 
  Layers,
  Loader2
} from "lucide-react";
import { motion, Reorder, AnimatePresence } from "motion/react";

// Set up PDF.js worker using a stable 4.x version from cdnjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl?: string;
}

export default function App() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const generateThumbnail = async (file: File): Promise<string | undefined> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) return undefined;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await (page as any).render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return undefined;
    }
  };

  const addFiles = async (newFiles: File[]) => {
    setIsProcessing(true);
    const pdfFiles: PDFFile[] = [];
    
    for (const file of newFiles) {
      if (file.type === "application/pdf") {
        const previewUrl = await generateThumbnail(file);
        pdfFiles.push({
          id: Math.random().toString(36).substring(7) + Date.now(),
          file,
          name: file.name,
          size: file.size,
          previewUrl,
        });
      }
    }
    
    setFiles((prev) => [...prev, ...pdfFiles]);
    setIsProcessing(false);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Please select at least 2 PDFs to merge.");
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const buffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged_premium.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("An error occurred while merging the PDFs.");
    } finally {
      setIsMerging(false);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const formattedSize = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A] text-[#1D1D1F] dark:text-[#F8FAFC] transition-colors duration-300 font-sans">
      {/* Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Layers className="text-blue-600 dark:text-blue-400" />
          <span>Merge<span className="text-blue-600 dark:text-blue-400">PDF</span></span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9, rotate: 15 }}
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDarkMode ? "dark" : "light"}
              initial={{ y: -20, opacity: 0, rotate: -90 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 20, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {isDarkMode ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-slate-600" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold mb-4 tracking-tight"
          >
            Merge PDF Files
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 dark:text-slate-400 text-lg"
          >
            Drag, reorder, and merge your documents with professional precision.
          </motion.p>
        </div>

        {/* Upload Box */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!isProcessing) addFiles(Array.from(e.dataTransfer.files));
          }}
          className={`group relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm transition-all mb-8 ${isProcessing ? "cursor-wait opacity-80" : "cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            multiple
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              {isProcessing ? <Loader2 size={40} className="animate-spin" /> : <Upload size={40} />}
            </div>
            <div>
              <p className="text-xl font-semibold mb-1">
                {isProcessing ? "Generating previews..." : "Drop PDFs here or click to browse"}
              </p>
              <p className="text-sm text-slate-400">100% secure, client-side processing</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95, translateY: 0 }}
              disabled={isProcessing}
              className={`mt-4 px-8 py-3 rounded-xl font-medium shadow-lg transition-all ${isProcessing ? "bg-slate-400 cursor-not-allowed" : "bg-black dark:bg-white text-white dark:text-black hover:shadow-xl"}`}
            >
              Select Files
            </motion.button>
          </div>
        </motion.div>

        {files.length > 0 && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Summary</p>
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{files.length}</span>
                    <span className="text-xs text-slate-400">Files</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{formattedSize}</span>
                    <span className="text-xs text-slate-400">MB Total</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={clearAll}
                disabled={isProcessing}
                className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                Clear All
              </button>
            </div>

            {/* Reorderable List */}
            <Reorder.Group
              axis="y"
              values={files}
              onReorder={setFiles}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {files.map((file) => (
                  <Reorder.Item
                    key={file.id}
                    value={file}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                      <div className="text-slate-300 dark:text-slate-600">
                        <GripVertical size={20} />
                      </div>
                      
                      {/* PDF Preview / Icon */}
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        {file.previewUrl ? (
                          <img 
                            src={file.previewUrl} 
                            alt={file.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileText size={24} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {/* Action Button */}
            <div className="pt-8 flex justify-center">
              <button
                onClick={mergePDFs}
                disabled={isMerging || isProcessing || files.length < 2}
                className={`
                  relative overflow-hidden flex items-center gap-3 px-12 py-5 rounded-2xl font-bold text-lg shadow-2xl transition-all
                  ${isMerging || isProcessing || files.length < 2 
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-1 active:translate-y-0"}
                `}
              >
                {isMerging ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Download size={22} />
                    Merge & Download
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-12 text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800">
        <p>© 2026 MergePDF Premium — 100% Client‑Side & Secure</p>
      </footer>
    </div>
  );
}
