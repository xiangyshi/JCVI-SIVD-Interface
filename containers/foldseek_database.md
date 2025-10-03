# Guide on Foldseek Databases

## Quick Start

**Locate `make_foldseek_db.sh` under directory `foldseek/`**
- Prepare fasta file of target proteins (from **[UniProt](www.uniprot.org)**)
  - Example: **[SARS-CoV Proteome](https://www.uniprot.org/proteomes/UP000000354)**
- Download and place fasta file under `foldseek/`
- Execute command `./make_foldseek_db.sh <fasta_file> <name_for_db>`
  - Example: `./make_foldseek_db.sh SARS-CoV.fasta sars-cov`
- You should find the new database for that fasta file under `foldseek/database/`
- In zqjd/zqjd77/tools/foldseek.html, populate the `<select id="database" name="database">` with an option for the new folder in zqjd/containers/foldseek/database, setting the option’s value to the corresponding folder name.
- Note: This process may take a while, the SARS-Covid.fasta file took ~6 minutes to process.

## Official Reference (Adjust `make_foldseek_db.sh` or create new script as necessary)
### Databases
The databases command downloads pre-generated databases like PDB or AlphaFoldDB.

```
# pdb  
foldseek databases PDB pdb tmp 
# alphafold db
foldseek databases Alphafold/Proteome afdb tmp 
```

We currently support the following databases:
```
  Name                   	Type     	Taxonomy	Url
- Alphafold/UniProt   	Aminoacid	     yes	https://alphafold.ebi.ac.uk/
- Alphafold/UniProt50 	Aminoacid	     yes	https://alphafold.ebi.ac.uk/
- Alphafold/Proteome  	Aminoacid	     yes	https://alphafold.ebi.ac.uk/
- Alphafold/Swiss-Prot	Aminoacid	     yes	https://alphafold.ebi.ac.uk/
- ESMAtlas30          	Aminoacid	       -	https://esmatlas.com
- PDB                 	Aminoacid	     yes	https://www.rcsb.org
```

### Create custom databases and indexes
The target database can be pre-processed by createdb. This is useful when searching multiple times against the same set of target structures.

```
foldseek createdb example/ targetDB
foldseek createindex targetDB tmp  #OPTIONAL generates and stores the index on disk
foldseek easy-search example/d1asha_ targetDB aln.m8 tmpFolder
```
### Create custom database from protein sequence (FASTA)
Create a structural database from FASTA files using the ProstT5 protein language model. It runs by default on CPU and is about 400-4000x compared to predicted structures by ColabFold. However, this database will contain only the predicted 3Di structural sequences without additional structural details. As a result, it supports monomer search and clustering, but does not enable features requiring Cα information, such as --alignment-type 1, TM-score or LDDT output.

```
foldseek databases ProstT5 weights tmp
foldseek createdb db.fasta db --prostt5-model weights
```

Accelerate inference by one to two magnitudes using GPU(s) (--gpu 1)
```
foldseek createdb db.fasta db --prostt5-model weights --gpu 1
```
- Use the CUDA_VISIBLE_DEVICES variable to select the GPU device(s).
    - CUDA_VISIBLE_DEVICES=0 to use GPU 0.
    - CUDA_VISIBLE_DEVICES=0,1 to use GPUs 0 and 1.

## Official Documentation Reference
[Foldseek github](https://github.com/steineggerlab/foldseek?tab=readme-ov-file#create-custom-databases-and-indexes)
